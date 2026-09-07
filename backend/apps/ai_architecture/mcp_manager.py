import logging
import asyncio
import json
from django.conf import settings
from django.core.cache import cache
try:
    from mcp import ClientSession
    from mcp.client.sse import sse_client
    from mcp.client.stdio import stdio_client, StdioServerParameters
    MCP_AVAILABLE = True
except Exception:
    ClientSession = None  # type: ignore[assignment]
    sse_client = None  # type: ignore[assignment]
    stdio_client = None  # type: ignore[assignment]
    StdioServerParameters = None  # type: ignore[assignment]
    MCP_AVAILABLE = False

logger = logging.getLogger(__name__)

class MCPManager:
    """
    Manages connections to multiple remote/local MCP servers (SSE & Stdio).
    Discovers tools and routes execution calls.
    """
    def __init__(self, sse_urls: list[str], stdio_configs: list[dict]):
        self.sse_urls = sse_urls
        self.stdio_configs = stdio_configs
        self._server_tool_map = {} # tool_name -> {"type": "...", "config": ...}

    async def _fetch_tools_from_sse(self, url: str):
        """Connect to a single SSE MCP server and list its tools."""
        try:
            async with sse_client(url) as streams:
                async with ClientSession(streams[0], streams[1]) as session:
                    await session.initialize()
                    tools_result = await session.list_tools()
                    server_tools = []
                    for t in tools_result.tools:
                        server_tools.append({
                            "name": t.name,
                            "description": t.description or "",
                            "input_schema": t.inputSchema,
                        })
                        self._server_tool_map[t.name] = {"type": "sse", "url": url}
                    return server_tools
        except Exception as e:
            logger.error(f"Failed to fetch tools from MCP SSE server {url}: {e}")
            return []

    async def _fetch_tools_from_stdio(self, config: dict):
        """Connect to a stdio-based local MCP server."""
        command = config.get("command")
        args = config.get("args", [])
        try:
            params = StdioServerParameters(command=command, args=args)
            async with stdio_client(params) as streams:
                async with ClientSession(streams[0], streams[1]) as session:
                    await session.initialize()
                    tools_result = await session.list_tools()
                    server_tools = []
                    for t in tools_result.tools:
                        server_tools.append({
                            "name": t.name,
                            "description": t.description or "",
                            "input_schema": t.inputSchema,
                        })
                        self._server_tool_map[t.name] = {"type": "stdio", "config": config}
                    return server_tools
        except Exception as e:
            logger.error(f"Failed to fetch tools from MCP stdio {command} {args}: {e}")
            return []

    async def get_all_tools(self):
        """Parallel fetch tools from all configured servers."""
        if not self.sse_urls and not self.stdio_configs:
            return []
            
        tasks = []
        for url in self.sse_urls:
            tasks.append(self._fetch_tools_from_sse(url))
        for cfg in self.stdio_configs:
            tasks.append(self._fetch_tools_from_stdio(cfg))
            
        results = await asyncio.gather(*tasks)
        # Flatten results
        return [item for sublist in results for item in sublist]

    async def execute_tool(self, tool_name: str, arguments: dict):
        """Route tool call to the correct remote server."""
        if not self._server_tool_map:
            await self.get_all_tools()

        server_info = self._server_tool_map.get(tool_name)
        if not server_info:
            return {"error": f"Tool {tool_name} not found on any configured MCP server."}

        try:
            if server_info["type"] == "sse":
                async with sse_client(server_info["url"]) as streams:
                    async with ClientSession(streams[0], streams[1]) as session:
                        await session.initialize()
                        result = await session.call_tool(tool_name, arguments)
                        return [c.model_dump() for c in result.content]
            elif server_info["type"] == "stdio":
                config = server_info["config"]
                params = StdioServerParameters(command=config["command"], args=config.get("args", []))
                async with stdio_client(params) as streams:
                    async with ClientSession(streams[0], streams[1]) as session:
                        await session.initialize()
                        result = await session.call_tool(tool_name, arguments)
                        return [c.model_dump() for c in result.content]
        except Exception as e:
            logger.error(f"Failed to execute MCP tool {tool_name}: {e}")
            return {"error": str(e)}


# ── Sync Helpers for Django Views ─────────────────────────────────────

def sync_get_mcp_tools():
    """Sync wrapper to discover tools with caching."""
    if not MCP_AVAILABLE:
        return []

    urls = getattr(settings, 'MCP_SERVERS', [])
    stdio = getattr(settings, 'MCP_STDIO_SERVERS', [])
    
    if not urls and not stdio:
        return []
        
    cache_key = f"mcp_tools_v2_{hash(tuple(urls))}_{hash(str(stdio))}"
    cached_tools = cache.get(cache_key)
    if cached_tools:
        return cached_tools

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        manager = MCPManager(urls, stdio)
        tools = loop.run_until_complete(manager.get_all_tools())
        loop.close()
        
        if tools:
            cache.set(cache_key, tools, 3600) # Cache for 1 hour
        return tools
    except Exception as e:
        logger.error(f"Sync MCP tool discovery failed: {e}", exc_info=True)
        return []

def sync_execute_mcp_tool(tool_name, arguments):
    """Sync wrapper to execute a tool."""
    if not MCP_AVAILABLE:
        return {"error": "MCP dependency is not installed on the backend."}

    urls = getattr(settings, 'MCP_SERVERS', [])
    stdio = getattr(settings, 'MCP_STDIO_SERVERS', [])
    
    if not urls and not stdio:
        return {"error": "No MCP servers configured."}
        
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        manager = MCPManager(urls, stdio)
        result = loop.run_until_complete(manager.execute_tool(tool_name, arguments))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Sync MCP execution failed: {e}", exc_info=True)
        return {"error": str(e)}
