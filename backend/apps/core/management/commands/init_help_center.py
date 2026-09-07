from django.core.management.base import BaseCommand
from apps.core.models import HelpCenterCategory, HelpCenterArticle, FAQ


class Command(BaseCommand):
    help = 'Initialize help center with dummy data'

    def handle(self, *args, **options):
        self.stdout.write('Creating help center categories and articles...')

        # Create categories
        categories_data = [
            {
                'name': 'Getting Started',
                'slug': 'getting-started',
                'description': 'Learn the basics of using DzeNhare SQB',
                'icon': 'Rocket',
                'order': 1,
            },
            {
                'name': 'Projects',
                'slug': 'projects',
                'description': 'Everything about managing your projects',
                'icon': 'Construction',
                'order': 2,
            },
            {
                'name': 'Payments & Billing',
                'slug': 'payments-billing',
                'description': 'Information about payments, escrow, and billing',
                'icon': 'CreditCard',
                'order': 3,
            },
            {
                'name': 'Contractors & Suppliers',
                'slug': 'contractors-suppliers',
                'description': 'Working with contractors and suppliers',
                'icon': 'Users',
                'order': 4,
            },
            {
                'name': 'Account & Settings',
                'slug': 'account-settings',
                'description': 'Manage your account and preferences',
                'icon': 'Settings',
                'order': 5,
            },
            {
                'name': 'Troubleshooting',
                'slug': 'troubleshooting',
                'description': 'Common issues and solutions',
                'icon': 'HelpCircle',
                'order': 6,
            },
        ]

        categories = {}
        for cat_data in categories_data:
            category, created = HelpCenterCategory.objects.get_or_create(
                slug=cat_data['slug'],
                defaults=cat_data
            )
            categories[cat_data['slug']] = category
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
            else:
                self.stdout.write(f'Category already exists: {category.name}')

        # Create articles
        articles_data = [
            {
                'category_slug': 'getting-started',
                'title': 'Welcome to DzeNhare SQB',
                'slug': 'welcome-to-dzenhare-sqb',
                'excerpt': 'An introduction to the platform and its features',
                'content': '''# Welcome to DzeNhare SQB

DzeNhare SQB is a comprehensive construction project management platform designed to help builders, contractors, and suppliers collaborate effectively.

## What is DzeNhare SQB?

DzeNhare SQB (Smart Quality Builder) is a digital platform that streamlines construction project management from planning to completion. Our platform offers three engagement tiers:

- **DIY (Do It Yourself)**: Free toolkit for managing your own projects
- **DIT (Do It Together)**: Guided co-pilot with consultant support
- **DIFY (Do It For You)**: Full autopilot service managed by experts

## Key Features

- Project management and tracking
- Milestone-based payments and escrow
- Contractor and supplier connections
- Compliance verification (SI 56)
- Real-time project updates
- Cost calculators and roadmaps

## Getting Started

1. Complete your profile setup
2. Choose your engagement tier
3. Create your first project
4. Start collaborating with contractors and suppliers

For more detailed information, explore our other help articles.''',
                'is_featured': True,
                'order': 1,
            },
            {
                'category_slug': 'getting-started',
                'title': 'Creating Your First Project',
                'slug': 'creating-your-first-project',
                'excerpt': 'Step-by-step guide to creating a new project',
                'content': '''# Creating Your First Project

Follow these steps to create your first project on DzeNhare SQB.

## Step 1: Navigate to Projects

Go to the Builder Dashboard and click on the "Projects" tab, then click "Create New Project".

## Step 2: Fill in Project Details

- **Title**: Give your project a descriptive name
- **Location**: Enter the project address (the map will automatically navigate)
- **Budget**: Set your project budget
- **Engagement Tier**: Choose DIY, DIT, or DIFY
- **Status**: Set initial status (usually "Planning")

## Step 3: Submit

Click "Create Project" to save your project. You'll be redirected to the project dashboard where you can:
- View project details
- Add milestones
- Track progress
- Manage payments

## Next Steps

After creating your project, you can:
- Add milestones for payment tracking
- Invite contractors to bid
- Order materials from suppliers
- Track project progress using the roadmap''',
                'is_featured': True,
                'order': 2,
            },
            {
                'category_slug': 'projects',
                'title': 'Understanding Project Roadmaps',
                'slug': 'understanding-project-roadmaps',
                'excerpt': 'Learn how to use the project roadmap feature',
                'content': '''# Understanding Project Roadmaps

The Project Roadmap helps you track your project through 6 key stages.

## The 6 Stages

1. **Planning & Design**: Define scope, budget, and design requirements
2. **Site Preparation**: Prepare site and gather materials
3. **Foundation & Structure**: Build foundation and main structure
4. **Systems Installation**: Install electrical, plumbing, and HVAC
5. **Interior & Exterior Finishing**: Complete finishes
6. **Final Completion**: Final inspections and handover

## How It Works

Each stage has:
- **Planning Tasks**: Specific tasks to complete
- **Assessment**: Required assessment before proceeding
- **Progress Tracking**: Visual progress indicator
- **Milestone Billing**: Automatic milestone creation when stage is complete

## Unlocking Stages

Stages unlock sequentially. Complete all tasks and the assessment in the current stage to unlock the next one.

## Milestone Payments

When a stage is completed, a milestone bill is automatically generated. You can view and pay the milestone directly from the roadmap.''',
                'is_featured': False,
                'order': 1,
            },
            {
                'category_slug': 'projects',
                'title': 'Managing Milestones',
                'slug': 'managing-milestones',
                'excerpt': 'How to create and manage project milestones',
                'content': '''# Managing Milestones

Milestones help you track project progress and manage payments.

## Creating Milestones

Milestones can be created:
- Automatically when completing roadmap stages
- Manually from the project dashboard
- Through the Escrow tab

## Milestone Status

Milestones have three statuses:
- **Pending**: Created but not yet verified
- **Verified**: Verified and ready for payment
- **Paid**: Payment has been recorded

## Making Payments

1. Go to the Escrow tab
2. Find the milestone you want to pay
3. Click "Add Payment"
4. Select payment method (Cash, Swipe/Paynow, or Stripe)
5. Enter payment details and submit

## Payment Methods

- **Cash**: Physical cash payment with optional reference number
- **Swipe/Paynow**: Mobile payment or card swipe with transaction ID
- **Stripe**: Online card payment with transaction ID''',
                'is_featured': False,
                'order': 2,
            },
            {
                'category_slug': 'payments-billing',
                'title': 'Understanding Escrow',
                'slug': 'understanding-escrow',
                'excerpt': 'How the escrow system works',
                'content': '''# Understanding Escrow

Our escrow system ensures secure payment management for your projects.

## What is Escrow?

Escrow is a financial arrangement where funds are held by a third party until specific conditions are met. In DzeNhare SQB, escrow helps protect both builders and contractors.

## How It Works

1. **Milestone Creation**: When a project milestone is completed, a payment milestone is created
2. **Fund Holding**: Funds are held in escrow until verification
3. **Verification**: Milestone is verified as complete
4. **Payment Release**: Payment is released to the contractor

## Escrow Dashboard

The Escrow tab shows:
- Total project budget
- Amount paid so far
- Remaining balance
- Next payment milestone
- Payment history

## Benefits

- Secure payment management
- Milestone-based tracking
- Transparent financial records
- Protection for all parties''',
                'is_featured': True,
                'order': 1,
            },
            {
                'category_slug': 'payments-billing',
                'title': 'Payment Methods Explained',
                'slug': 'payment-methods-explained',
                'excerpt': 'Understanding available payment methods',
                'content': '''# Payment Methods Explained

DzeNhare SQB supports multiple payment methods for your convenience.

## Cash Payments

- Physical cash transactions
- Optional reference number for tracking
- Best for small, local transactions

## Swipe/Paynow

- Mobile payment solutions
- Card swipe transactions
- Requires transaction ID from payment provider
- Popular for on-site payments

## Stripe

- Online card payments
- Secure payment processing
- Requires transaction ID
- Best for remote or large transactions

## Recording Payments

When recording a payment:
1. Select the milestone
2. Enter the amount
3. Choose payment method
4. Add transaction/reference details
5. Submit

All payments are recorded and tracked in your escrow dashboard.''',
                'is_featured': False,
                'order': 2,
            },
            {
                'category_slug': 'contractors-suppliers',
                'title': 'Finding and Hiring Contractors',
                'slug': 'finding-and-hiring-contractors',
                'excerpt': 'How to find and work with contractors',
                'content': '''# Finding and Hiring Contractors

Connect with qualified contractors for your projects.

## Browsing Contractors

1. Go to the "Contractors" tab in your dashboard
2. Browse available contractors
3. View contractor profiles including:
   - Company information
   - Average ratings
   - Number of completed projects
   - Previous work

## Contractor Profiles

Each contractor profile shows:
- Company name and license number
- Contact information
- Average client rating
- Completed projects count
- Portfolio of work

## Hiring Process

1. Browse contractors
2. View detailed profiles
3. Contact contractors directly
4. Review bids on your projects
5. Accept the best bid

## Ratings and Reviews

Contractors are rated by builders based on:
- Quality of work
- Timeliness
- Communication
- Overall satisfaction

Use ratings to help make informed decisions.''',
                'is_featured': False,
                'order': 1,
            },
            {
                'category_slug': 'account-settings',
                'title': 'Updating Your Profile',
                'slug': 'updating-your-profile',
                'excerpt': 'How to update your profile information',
                'content': '''# Updating Your Profile

Keep your profile information up to date.

## Profile Information

Your profile includes:
- First and last name
- Email address
- Phone number
- Address
- Avatar/Profile picture
- Role (Builder, Contractor, Supplier)

## Updating Profile

1. Go to Settings > Profile
2. Click "Edit" on any section
3. Make your changes
4. Click "Save"

## Uploading Avatar

1. Click on your current avatar
2. Select a new image file
3. The image will be compressed and uploaded
4. Your new avatar will appear immediately

## Profile Visibility

Your profile information is visible to:
- Other users you're working with
- Contractors and suppliers on your projects
- System administrators

Keep your information current for better collaboration.''',
                'is_featured': False,
                'order': 1,
            },
            {
                'category_slug': 'troubleshooting',
                'title': 'Common Issues and Solutions',
                'slug': 'common-issues-and-solutions',
                'excerpt': 'Solutions to frequently encountered problems',
                'content': '''# Common Issues and Solutions

Here are solutions to common problems you might encounter.

## Payment Not Recording

**Problem**: Payment isn't showing up after submission.

**Solution**:
- Check your internet connection
- Verify transaction ID is correct
- Refresh the page
- Contact support if issue persists

## Can't Create Project

**Problem**: Unable to create a new project.

**Solution**:
- Ensure all required fields are filled
- Check that location is valid
- Verify budget is a positive number
- Try refreshing and creating again

## Milestone Not Unlocking

**Problem**: Next stage in roadmap won't unlock.

**Solution**:
- Verify all tasks in current stage are completed
- Ensure assessment is completed
- Check that stage shows as "Completed"
- Refresh the page

## Contact Support

If you continue to experience issues:
- Email: support@dzenhare.com
- Phone: Available in your dashboard
- Live chat: Available during business hours''',
                'is_featured': True,
                'order': 1,
            },
        ]

        for article_data in articles_data:
            category = categories[article_data.pop('category_slug')]
            article, created = HelpCenterArticle.objects.get_or_create(
                slug=article_data['slug'],
                defaults={
                    **article_data,
                    'category': category
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created article: {article.title}'))
            else:
                self.stdout.write(f'Article already exists: {article.title}')

        # Create FAQs
        faqs_data = [
            {
                'category_slug': 'getting-started',
                'question': 'What is DzeNhare SQB?',
                'answer': 'DzeNhare SQB (Smart Quality Builder) is a comprehensive construction project management platform that helps builders, contractors, and suppliers collaborate effectively. It offers three engagement tiers: DIY (free toolkit), DIT (guided co-pilot), and DIFY (full autopilot service).',
                'order': 1,
            },
            {
                'category_slug': 'getting-started',
                'question': 'How do I get started?',
                'answer': 'Getting started is easy! First, complete your profile setup with your basic information. Then, choose your engagement tier based on your needs. Finally, create your first project and start collaborating with contractors and suppliers.',
                'order': 2,
            },
            {
                'category_slug': 'projects',
                'question': 'How do I create a project?',
                'answer': 'To create a project, go to the Builder Dashboard, click on the "Projects" tab, and then click "Create New Project". Fill in the project details including title, location, budget, engagement tier, and status. The map will automatically navigate to your entered location.',
                'order': 1,
            },
            {
                'category_slug': 'projects',
                'question': 'What are the different engagement tiers?',
                'answer': 'DzeNhare SQB offers three engagement tiers:\n\n1. **DIY (Do It Yourself)**: Free toolkit for managing your own projects independently\n2. **DIT (Do It Together)**: Guided co-pilot with consultant support and validation\n3. **DIFY (Do It For You)**: Full autopilot service where experts manage the critical path and budget',
                'order': 2,
            },
            {
                'category_slug': 'payments-billing',
                'question': 'How does the escrow system work?',
                'answer': 'The escrow system holds funds securely until project milestones are completed. When a milestone is verified as complete, a payment milestone is created. Funds are held in escrow until verification, then released to the contractor. This protects both builders and contractors.',
                'order': 1,
            },
            {
                'category_slug': 'payments-billing',
                'question': 'What payment methods are accepted?',
                'answer': 'We accept three payment methods:\n\n1. **Cash**: Physical cash payments with optional reference numbers\n2. **Swipe/Paynow**: Mobile payments or card swipes with transaction IDs\n3. **Stripe**: Online card payments with secure processing',
                'order': 2,
            },
            {
                'category_slug': 'payments-billing',
                'question': 'When are milestone payments due?',
                'answer': 'Milestone payments are due when a project stage is completed. The system automatically creates a milestone bill when all tasks and assessments for a stage are finished. You can view and pay milestones directly from the project roadmap or escrow dashboard.',
                'order': 3,
            },
            {
                'category_slug': 'contractors-suppliers',
                'question': 'How do I find contractors?',
                'answer': 'You can browse available contractors in the "Contractors" tab of your dashboard. View contractor profiles to see their ratings, completed projects, and previous work. You can contact contractors directly and review their bids on your projects.',
                'order': 1,
            },
            {
                'category_slug': 'contractors-suppliers',
                'question': 'How are contractors rated?',
                'answer': 'Contractors are rated by builders based on quality of work, timeliness, communication, and overall satisfaction. Ratings are displayed on contractor profiles to help you make informed decisions when hiring.',
                'order': 2,
            },
            {
                'category_slug': 'account-settings',
                'question': 'How do I update my profile?',
                'answer': 'To update your profile, go to Settings > Profile. Click "Edit" on any section, make your changes, and click "Save". You can update your name, phone number, address, and upload a new avatar/profile picture.',
                'order': 1,
            },
            {
                'category_slug': 'account-settings',
                'question': 'Can I change my email address?',
                'answer': 'Email addresses are managed by your administrator for security purposes. If you need to change your email, please contact support or your system administrator.',
                'order': 2,
            },
            {
                'category_slug': 'troubleshooting',
                'question': 'My payment is not showing up. What should I do?',
                'answer': 'If your payment isn\'t showing up, first check your internet connection. Verify that the transaction ID is correct. Try refreshing the page. If the issue persists, contact our support team for assistance.',
                'order': 1,
            },
            {
                'category_slug': 'troubleshooting',
                'question': 'I can\'t unlock the next stage in my roadmap. Why?',
                'answer': 'To unlock the next stage, you must complete all tasks in the current stage, including the assessment. Make sure all checkboxes are checked and the stage shows as "Completed". Try refreshing the page if it still doesn\'t unlock.',
                'order': 2,
            },
            {
                'category_slug': 'troubleshooting',
                'question': 'How do I contact support?',
                'answer': 'You can contact support through:\n\n- Email: support@dzenhare.com\n- Phone: Available in your dashboard\n- Live chat: Available during business hours\n\nWe\'re here to help with any questions or issues you may have.',
                'order': 3,
            },
        ]

        for faq_data in faqs_data:
            category = categories[faq_data.pop('category_slug')]
            faq, created = FAQ.objects.get_or_create(
                question=faq_data['question'],
                defaults={
                    **faq_data,
                    'category': category
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created FAQ: {faq.question}'))
            else:
                self.stdout.write(f'FAQ already exists: {faq.question}')

        self.stdout.write(self.style.SUCCESS('Help center initialization complete!'))

