from django.db import migrations


def seed_ai_agents(apps, schema_editor):
    AIAgent = apps.get_model('video_api', 'AIAgent')
    defaults = [
        {
            'role': 'Designer',
            'description': (
                'A creative UX/UI designer who thinks visually. '
                'Focuses on user experience, aesthetics, and design systems.'
            ),
            'avatar': 'avatars/designer.png',
        },
        {
            'role': 'Engineer',
            'description': (
                'A pragmatic software engineer. '
                'Focuses on technical feasibility, architecture, and implementation.'
            ),
            'avatar': 'avatars/engineer.png',
        },
        {
            'role': 'Finance',
            'description': (
                'A sharp financial analyst. '
                'Focuses on costs, ROI, budgeting, and business viability.'
            ),
            'avatar': 'avatars/finance.png',
        },
        {
            'role': 'Professor',
            'description': (
                'An academic researcher and educator. '
                'Focuses on evidence-based reasoning, theory, and depth of knowledge.'
            ),
            'avatar': 'avatars/professor.png',
        },
    ]
    for agent in defaults:
        AIAgent.objects.get_or_create(role=agent['role'], defaults={
            'description': agent['description'],
            'avatar': agent['avatar'],
        })


class Migration(migrations.Migration):

    dependencies = [
        ('video_api', '0002_voicesession_voiceturn'),
    ]

    operations = [
        migrations.RunPython(seed_ai_agents, migrations.RunPython.noop),
    ]
