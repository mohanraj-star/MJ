const { useState } = React;

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="react-panel">
      <h3>React Counter</h3>
      <div className="counter-display">{count}</div>
      <div className="counter-controls">
        <button onClick={() => setCount(c => c - 1)} aria-label="Decrement">−</button>
        <button onClick={() => setCount(0)} aria-label="Reset">↺</button>
        <button onClick={() => setCount(c => c + 1)} aria-label="Increment">+</button>
      </div>
    </div>
  );
}

function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn HTML structure', done: true },
    { id: 2, text: 'Style with CSS', done: true },
    { id: 3, text: 'Build with React', done: false }
  ]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTodos(prev => [...prev, { id: Date.now(), text: trimmed, done: false }]);
    setInput('');
  };

  const toggleTodo = (id) => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const removeTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addTodo();
  };

  return (
    <div className="react-panel">
      <h3>React Todo List</h3>
      <div className="todo-input-row">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new task..."
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul className="todo-list">
        {todos.map(todo => (
          <li key={todo.id} className={`todo-item${todo.done ? ' done' : ''}`}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
            />
            <span>{todo.text}</span>
            <button onClick={() => removeTodo(todo.id)} aria-label="Remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <>
      <Counter />
      <TodoList />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('react-root'));
root.render(<App />);
