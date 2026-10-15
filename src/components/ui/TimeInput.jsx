import Input from './Input'

const TimeInput = ({ label, value, onChange, error, hint, id, className }) => (
  <Input
    id={id}
    label={label}
    type="time"
    step={60}
    value={value || ''}
    onChange={onChange}
    error={error}
    hint={hint}
    containerClassName={className}
  />
)

export default TimeInput
