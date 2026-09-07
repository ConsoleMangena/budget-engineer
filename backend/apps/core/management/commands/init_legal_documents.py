from django.core.management.base import BaseCommand
from apps.core.models import LegalDocument

class Command(BaseCommand):
    help = 'Initialize Terms of Service and Privacy Policy documents'

    def handle(self, *args, **options):
        # Terms of Service
        terms_content = """<div class="space-y-4">
            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
                <p class="text-sm leading-relaxed">
                    By accessing and using DzeNhare SQB, you accept and agree to be bound by the terms and provision of this agreement. 
                    If you do not agree to abide by the above, please do not use this service.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">2. Use License</h3>
                <p class="text-sm leading-relaxed">
                    Permission is granted to temporarily use DzeNhare SQB for personal and commercial construction project management. 
                    This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul class="list-disc list-inside mt-2 space-y-1 text-sm ml-4">
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for any commercial purpose without explicit permission</li>
                    <li>Attempt to decompile or reverse engineer any software</li>
                    <li>Remove any copyright or other proprietary notations from the materials</li>
                </ul>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">3. User Accounts</h3>
                <p class="text-sm leading-relaxed">
                    When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
                    You are responsible for safeguarding the password and for all activities that occur under your account.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">4. Project Management</h3>
                <p class="text-sm leading-relaxed">
                    DzeNhare SQB provides a platform for connecting builders, contractors, and suppliers. 
                    All parties are responsible for their own compliance with local building codes, regulations, and professional standards.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">5. Payment and Escrow</h3>
                <p class="text-sm leading-relaxed">
                    Payment processing is handled through secure third-party providers. 
                    DzeNhare SQB facilitates escrow services but is not responsible for payment disputes between parties.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">6. Limitation of Liability</h3>
                <p class="text-sm leading-relaxed">
                    In no event shall DzeNhare SQB or its suppliers be liable for any damages (including, without limitation, 
                    damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">7. Revisions</h3>
                <p class="text-sm leading-relaxed">
                    DzeNhare SQB may revise these terms of service at any time without notice. 
                    By using this website you are agreeing to be bound by the then current version of these terms of service.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">8. Contact Information</h3>
                <p class="text-sm leading-relaxed">
                    If you have any questions about these Terms of Service, please contact us through our support channels.
                </p>
            </section>
        </div>"""

        terms, created = LegalDocument.objects.get_or_create(
            document_type='TERMS',
            defaults={
                'title': 'Terms of Service',
                'content': terms_content,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created Terms of Service'))
        else:
            self.stdout.write(self.style.WARNING('Terms of Service already exists'))

        # Privacy Policy
        privacy_content = """<div class="space-y-4">
            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
                <p class="text-sm leading-relaxed mb-2">
                    We collect information that you provide directly to us, including:
                </p>
                <ul class="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>Account information (name, email, phone number)</li>
                    <li>Profile information (role, company details, license numbers)</li>
                    <li>Project information and documents</li>
                    <li>Payment and transaction information</li>
                    <li>Communication records</li>
                </ul>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h3>
                <p class="text-sm leading-relaxed">
                    We use the information we collect to:
                </p>
                <ul class="list-disc list-inside mt-2 space-y-1 text-sm ml-4">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Send technical notices and support messages</li>
                    <li>Respond to your comments and questions</li>
                    <li>Monitor and analyze trends and usage</li>
                    <li>Detect, prevent, and address technical issues</li>
                </ul>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">3. Information Sharing</h3>
                <p class="text-sm leading-relaxed">
                    We do not sell, trade, or rent your personal information to third parties. 
                    We may share your information only in the following circumstances:
                </p>
                <ul class="list-disc list-inside mt-2 space-y-1 text-sm ml-4">
                    <li>With your consent</li>
                    <li>To comply with legal obligations</li>
                    <li>To protect and defend our rights</li>
                    <li>With service providers who assist in operating our platform</li>
                    <li>In connection with a business transfer</li>
                </ul>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">4. Data Security</h3>
                <p class="text-sm leading-relaxed">
                    We implement appropriate technical and organizational security measures to protect your personal information. 
                    However, no method of transmission over the Internet or electronic storage is 100% secure.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">5. Your Rights</h3>
                <p class="text-sm leading-relaxed">
                    You have the right to:
                </p>
                <ul class="list-disc list-inside mt-2 space-y-1 text-sm ml-4">
                    <li>Access and receive a copy of your personal data</li>
                    <li>Rectify inaccurate or incomplete data</li>
                    <li>Request deletion of your personal data</li>
                    <li>Object to processing of your personal data</li>
                    <li>Request restriction of processing</li>
                    <li>Data portability</li>
                </ul>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">6. Cookies and Tracking</h3>
                <p class="text-sm leading-relaxed">
                    We use cookies and similar tracking technologies to track activity on our platform and hold certain information. 
                    You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">7. Data Retention</h3>
                <p class="text-sm leading-relaxed">
                    We retain your personal information for as long as necessary to provide our services and comply with legal obligations. 
                    When we no longer need your information, we will securely delete or anonymize it.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">8. Children's Privacy</h3>
                <p class="text-sm leading-relaxed">
                    Our service is not intended for individuals under the age of 18. 
                    We do not knowingly collect personal information from children.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">9. Changes to This Policy</h3>
                <p class="text-sm leading-relaxed">
                    We may update our Privacy Policy from time to time. 
                    We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
            </section>

            <section>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">10. Contact Us</h3>
                <p class="text-sm leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us through our support channels.
                </p>
            </section>
        </div>"""

        privacy, created = LegalDocument.objects.get_or_create(
            document_type='PRIVACY',
            defaults={
                'title': 'Privacy Policy',
                'content': privacy_content,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created Privacy Policy'))
        else:
            self.stdout.write(self.style.WARNING('Privacy Policy already exists'))

        self.stdout.write(self.style.SUCCESS('Legal documents initialization complete!'))

