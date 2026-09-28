import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import { COMPANY_STATUSES, INDUSTRIES } from '../../data/seedData'
import { isEmail, required } from '../../utils/validators'

const EMPTY = {
  name: '', industry: 'Technology', status: 'Prospect', contactName: '',
  email: '', phone: '', website: '', location: '', notes: '',
}

const CompanyFormModal = ({ open, onClose, onSubmit, company }) => {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setValues(company ? { ...EMPTY, ...company } : EMPTY)
      setErrors({})
    }
  }, [open, company])

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const submit = () => {
    const next = {}
    if (required(values.name)) next.name = 'Enter the company name.'
    if (required(values.contactName)) next.contactName = 'Enter a primary contact.'
    if (required(values.email)) next.email = 'Enter a contact email.'
    else if (!isEmail(values.email)) next.email = 'Enter a valid email address.'
    setErrors(next)
    if (Object.keys(next).length) return
    onSubmit(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={company ? 'Edit company' : 'Create company'}
      description={company ? 'Update the organization record.' : 'Add a customer or prospect organization.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>{company ? 'Save changes' : 'Create company'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Company name" value={values.name} onChange={set('name')} error={errors.name} placeholder="ABC Technologies" containerClassName="sm:col-span-2" />
        <Select label="Industry" value={values.industry} onChange={set('industry')} options={INDUSTRIES} />
        <Select label="Status" value={values.status} onChange={set('status')} options={COMPANY_STATUSES} />
        <Input label="Primary contact" value={values.contactName} onChange={set('contactName')} error={errors.contactName} placeholder="Priya Raman" />
        <Input label="Email" type="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="contact@company.com" />
        <Input label="Phone" value={values.phone} onChange={set('phone')} placeholder="+1 415 555 0132" />
        <Input label="Website" value={values.website} onChange={set('website')} placeholder="company.com" />
        <Input label="Location" value={values.location} onChange={set('location')} placeholder="San Francisco, CA" containerClassName="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Textarea label="Notes" value={values.notes} onChange={set('notes')} placeholder="Context the team should know about this account." />
        </div>
      </div>
    </Modal>
  )
}

export default CompanyFormModal
