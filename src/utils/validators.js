export const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

export const required = (value) =>
  value === null || value === undefined || String(value).trim() === ''

export const validateLogin = ({ email, password }) => {
  const errors = {}
  if (required(email)) errors.email = 'Enter your email address.'
  else if (!isEmail(email)) errors.email = 'Enter a valid email address, like name@company.com.'
  if (required(password)) errors.password = 'Enter your password.'
  else if (password.length < 6) errors.password = 'Passwords are at least 6 characters.'
  return errors
}

export const validateSignup = ({ name, email, password, confirmPassword }) => {
  const errors = {}
  if (required(name)) errors.name = 'Enter your full name.'
  if (required(email)) errors.email = 'Enter your email address.'
  if (required(password)) errors.password = 'Enter a password.'
  else if (password.length < 6) errors.password = 'Passwords are at least 6 characters.'
  if (required(confirmPassword)) errors.confirmPassword = 'Confirm your password.'
  else if (password && confirmPassword && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export const validateMeeting = (values, { manualCompany = false } = {}) => {
  const errors = {}
  if (required(values.title)) errors.title = 'Give the meeting a title.'
  if (manualCompany) {
    if (required(values.companyName)) errors.companyName = 'Enter the company name.'
  } else if (required(values.companyId)) {
    errors.companyId = 'Select a company or enter one manually.'
  }
  if (required(values.date)) errors.date = 'Pick a meeting date.'
  if (required(values.startTime)) errors.startTime = 'Set a start time.'
  return errors
}
