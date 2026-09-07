"""Helpers for preliminary vs final project budgets."""
from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from .models import (
    Project,
    ProjectBudgetVersion,
    BOQBuildingItem,
    BOQProfessionalFee,
    BOQAdminExpense,
    BOQLabourCost,
    BOQMachinePlant,
    BOQLabourBreakdown,
    BOQScheduleTask,
    ScheduleOfMaterial,
)


def get_or_create_preliminary_version(project: Project) -> ProjectBudgetVersion:
    v, _ = ProjectBudgetVersion.objects.get_or_create(
        project=project,
        kind=ProjectBudgetVersion.Kind.PRELIMINARY,
        defaults={},
    )
    return v


def get_or_create_final_version(project: Project) -> ProjectBudgetVersion:
    v, _ = ProjectBudgetVersion.objects.get_or_create(
        project=project,
        kind=ProjectBudgetVersion.Kind.FINAL,
        defaults={},
    )
    return v


BOQ_MODELS = (
    BOQBuildingItem,
    BOQProfessionalFee,
    BOQAdminExpense,
    BOQLabourCost,
    BOQMachinePlant,
    BOQLabourBreakdown,
    BOQScheduleTask,
    ScheduleOfMaterial,
)


def _copy_boq_rows(src: ProjectBudgetVersion, dst: ProjectBudgetVersion) -> None:
    """Deep-copy every BOQ row from src version to dst (dst rows cleared first)."""
    for model in BOQ_MODELS:
        model.objects.filter(budget_version=dst).delete()

    for model in BOQ_MODELS:
        for row in model.objects.filter(budget_version=src).order_by("pk"):
            row.pk = None
            row.budget_version = dst
            row.save()


@transaction.atomic
def promote_preliminary_to_final(project: Project) -> ProjectBudgetVersion:
    """
    Replace final-budget rows with a copy of the preliminary budget.
    Clears any previous signature on the final version.
    """
    pre = get_or_create_preliminary_version(project)
    final = get_or_create_final_version(project)
    final.signed_at = None
    final.signed_by = None
    final.author_signature = ""
    final.signature_image = None
    final.save(
        update_fields=[
            "signed_at",
            "signed_by",
            "author_signature",
            "signature_image",
            "updated_at",
        ]
    )
    _copy_boq_rows(pre, final)
    # Unsigned final budget — block procurement until re-signed
    project.is_budget_signed = False
    project.save(update_fields=["is_budget_signed"])
    return final


def final_version_is_locked(version: ProjectBudgetVersion) -> bool:
    return version.kind == ProjectBudgetVersion.Kind.FINAL and version.signed_at is not None


def _money(v) -> Decimal:
    if v is None:
        return Decimal("0")
    return Decimal(str(v))


def _building_item_total(row: BOQBuildingItem) -> Decimal:
    a = _money(row.amount)
    if a > 0:
        return a
    return (_money(row.quantity) * _money(row.rate)).quantize(Decimal("0.01"))


def _labour_cost_total(row: BOQLabourCost) -> Decimal:
    tc = _money(row.total_cost)
    if tc > 0:
        return tc
    wb = _money(row.weekly_wage_bill)
    if wb > 0:
        return wb
    return (_money(row.daily_rate) * _money(row.total_man_days)).quantize(Decimal("0.01"))


def _machine_plant_total(row: BOQMachinePlant) -> Decimal:
    tc = _money(row.total_cost)
    if tc > 0:
        return tc
    wet = _money(row.daily_wet_rate) * _money(row.days_rqd)
    if wet > 0:
        return (wet + _money(row.fuel_cost)).quantize(Decimal("0.01"))
    dry = _money(row.dry_hire_rate) * _money(row.qty)
    if dry > 0:
        return dry.quantize(Decimal("0.01"))
    return Decimal("0")


def compute_budget_gross_total(bv: ProjectBudgetVersion) -> Decimal:
    """Sum of every price-like amount on all BOQ rows (schedule of materials has no amount field)."""
    t = Decimal("0")
    for row in bv.building_items.all():
        t += _building_item_total(row)
    for row in bv.professional_fees.all():
        t += _money(row.estimated_fee)
    for row in bv.admin_expenses.all():
        t += _money(row.total_cost)
    for row in bv.labour_costs.all():
        t += _labour_cost_total(row)
    for row in bv.machine_plants.all():
        t += _machine_plant_total(row)
    for row in bv.labour_breakdowns.all():
        lbt = _money(row.total_cost)
        if lbt <= 0:
            lbt = (_money(row.daily_rate) * _money(row.total_man_days)).quantize(Decimal("0.01"))
        t += lbt
    for row in bv.schedule_tasks.all():
        t += _money(row.est_cost)
    return t.quantize(Decimal("0.01"))


def format_gross_total(bv: ProjectBudgetVersion | None) -> str:
    if bv is None:
        return "0.00"
    return str(compute_budget_gross_total(bv))
