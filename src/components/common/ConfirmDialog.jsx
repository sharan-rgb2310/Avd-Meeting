import Modal from '../ui/Modal'
import Button from '../ui/Button'

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Delete this item?',
  description = 'This removes the record from your workspace. It cannot be undone.',
  confirmLabel = 'Delete',
  tone = 'danger',
  loading = false,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={tone} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-[13px] leading-relaxed text-muted">{description}</p>
  </Modal>
)

export default ConfirmDialog
