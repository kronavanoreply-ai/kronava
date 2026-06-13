export default function Confirm({ open, title, message, onConfirm, onCancel }) {
  return (
    <div className={`confirm-overlay ${open ? 'open' : ''}`}>
      <div className="confirm-box">
        <div className="confirm-title">{title}</div>
        <div className="confirm-msg">{message}</div>
        <div className="confirm-btns">
          <button className="confirm-btn cancel" onClick={onCancel}>Cancelar</button>
          <button className="confirm-btn danger" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
