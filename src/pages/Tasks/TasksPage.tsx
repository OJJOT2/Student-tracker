import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../stores/sessionStore'
import { useTaskStore, TaskStatus, Task } from '../../stores/taskStore'
import './TasksPage.css'

export function TasksPage() {
    const { tasks, addTask, moveTask, deleteTask } = useTaskStore()
    const { selectSession } = useSessionStore()
    const navigate = useNavigate()
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault()
        if (newTaskTitle.trim()) {
            addTask(newTaskTitle.trim())
            setNewTaskTitle('')
            setIsAdding(false)
        }
    }

    const handleSessionClick = async (path: string) => {
        await selectSession(path)
        navigate(`/sessions`) // Navigate to sessions page where session details are shown
    }

    const onDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId)
    }

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const onDrop = (e: React.DragEvent, status: TaskStatus) => {
        const taskId = e.dataTransfer.getData('taskId')
        if (taskId) {
            moveTask(taskId, status)
        }
    }

    const TaskColumn = ({ title, status, tasks }: { title: string, status: TaskStatus, tasks: Task[] }) => (
        <div
            className="task-column"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status)}
        >
            <div className={`column-header ${status}`}>
                <h3>{title}</h3>
                <span className="count">{tasks.length}</span>
            </div>
            <div className="task-list">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        className="task-card"
                        draggable
                        onDragStart={(e) => onDragStart(e, task.id)}
                    >
                        <div className="task-content">
                            <div className="task-title">{task.title}</div>
                            {task.sessionPath && (
                                <button
                                    className="link-btn"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleSessionClick(task.sessionPath!)
                                    }}
                                >
                                    🔗 Go to Session
                                </button>
                            )}
                        </div>
                        <button
                            className="delete-task-btn"
                            onClick={() => deleteTask(task.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="empty-column">Drop here</div>
                )}
            </div>
        </div>
    )

    return (
        <div className="tasks-page">
            <header className="tasks-header">
                <h1>Task Manager</h1>
                <button
                    className="add-task-btn"
                    onClick={() => setIsAdding(!isAdding)}
                >
                    + New Task
                </button>
            </header>

            {isAdding && (
                <form className="add-task-form" onSubmit={handleAddTask}>
                    <input
                        type="text"
                        placeholder="What needs to be done?"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        autoFocus
                    />
                    <div className="form-actions">
                        <button type="submit" className="save-btn">Add Task</button>
                        <button type="button" className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
                    </div>
                </form>
            )}

            <div className="kanban-board">
                <TaskColumn
                    title="To Do"
                    status="todo"
                    tasks={tasks.filter(t => t.status === 'todo')}
                />
                <TaskColumn
                    title="In Progress"
                    status="in-progress"
                    tasks={tasks.filter(t => t.status === 'in-progress')}
                />
                <TaskColumn
                    title="Done"
                    status="done"
                    tasks={tasks.filter(t => t.status === 'done')}
                />
            </div>
        </div>
    )
}
