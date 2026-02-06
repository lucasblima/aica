"""
Test script for write tools
Run with: python -m backend.agents.tools.test_write_tools
"""

import os
import sys
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from backend.agents.tools.supabase_tools import (
    create_task,
    complete_task,
    create_moment,
    get_pending_tasks,
    get_recent_moments
)
from google.adk.tools.tool_context import ToolContext


def create_mock_context(user_id: str) -> ToolContext:
    """Create a mock ToolContext for testing"""
    context = ToolContext()
    context.state["user_id"] = user_id
    return context


def test_create_task():
    """Test creating a task"""
    print("\n=== Testing create_task ===")

    # Replace with a real user_id from your database
    test_user_id = "00000000-0000-0000-0000-000000000000"  # CHANGE THIS
    context = create_mock_context(test_user_id)

    # Test 1: Create simple task
    result = create_task(
        tool_context=context,
        title="Test Task from ADK Agent",
        priority="high",
        priority_quadrant=2,  # Q2: Important but not urgent
        description="Testing the create_task tool"
    )
    print(f"Result 1: {result}")

    # Test 2: Create task with due date
    tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
    result2 = create_task(
        tool_context=context,
        title="Task with due date",
        priority="urgent",
        priority_quadrant=1,  # Q1: Urgent and important
        due_date=tomorrow
    )
    print(f"Result 2: {result2}")

    return result.get("task_id") if result.get("status") == "success" else None


def test_complete_task(task_id: str):
    """Test completing a task"""
    print("\n=== Testing complete_task ===")

    test_user_id = "00000000-0000-0000-0000-000000000000"  # CHANGE THIS
    context = create_mock_context(test_user_id)

    result = complete_task(tool_context=context, task_id=task_id)
    print(f"Result: {result}")


def test_create_moment():
    """Test creating a moment"""
    print("\n=== Testing create_moment ===")

    test_user_id = "00000000-0000-0000-0000-000000000000"  # CHANGE THIS
    context = create_mock_context(test_user_id)

    # Test 1: Simple moment
    result = create_moment(
        tool_context=context,
        content="Testing the moment creation tool. Feeling productive today!",
        emotion="excited"
    )
    print(f"Result 1: {result}")

    # Test 2: Moment with tags
    result2 = create_moment(
        tool_context=context,
        content="Successfully implemented the write tools for ADK agents.",
        emotion="grateful",
        tags=["trabalho", "conquista", "desenvolvimento"]
    )
    print(f"Result 2: {result2}")


def test_read_after_write():
    """Test reading data after writing"""
    print("\n=== Testing read after write ===")

    test_user_id = "00000000-0000-0000-0000-000000000000"  # CHANGE THIS
    context = create_mock_context(test_user_id)

    # Read pending tasks
    tasks_result = get_pending_tasks(tool_context=context)
    print(f"Pending tasks: {tasks_result.get('count')} tasks")
    if tasks_result.get('tasks'):
        for task in tasks_result['tasks'][:3]:  # Show first 3
            print(f"  - {task['title']} (priority: {task.get('priority')}, quadrant: {task.get('priority_quadrant')})")

    # Read recent moments
    moments_result = get_recent_moments(limit=3, tool_context=context)
    print(f"\nRecent moments: {moments_result.get('count')} moments")
    if moments_result.get('moments'):
        for moment in moments_result['moments']:
            print(f"  - {moment['content'][:50]}... (emotion: {moment.get('emotion')})")


def main():
    """Run all tests"""
    print("=" * 60)
    print("ADK WRITE TOOLS TEST SUITE")
    print("=" * 60)
    print("\nIMPORTANT: Update test_user_id with a real user UUID from your database!")
    print("You can get one from: SELECT id FROM auth.users LIMIT 1;")
    print("=" * 60)

    try:
        # Test task creation
        task_id = test_create_task()

        # Test moment creation
        test_create_moment()

        # Test reading after writes
        test_read_after_write()

        # Test task completion (if we got a task_id)
        if task_id:
            print("\nWaiting 2 seconds before completing task...")
            import time
            time.sleep(2)
            test_complete_task(task_id)

            # Read again to see the completed task
            test_read_after_write()

        print("\n" + "=" * 60)
        print("TESTS COMPLETED!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Check the database to verify data was created")
        print("2. Test via the ADK API endpoint")
        print("3. Test via the frontend UI")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
