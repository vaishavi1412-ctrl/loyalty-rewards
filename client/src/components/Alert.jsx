// Shows a success or error message. message = { type: 'success' | 'danger', text: '...' }
export default function Alert({ message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${message.type} alert-dismissible`} role="alert">
      {message.text}
      {onClose && <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />}
    </div>
  );
}
