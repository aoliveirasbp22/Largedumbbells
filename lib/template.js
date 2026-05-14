// Variable substitution for email/SMS templates.
//
// Replaces {{var_name}} placeholders with values from a lead record.
// Returns the original string if a variable isn't found (rather than 'undefined').

const VARIABLE_MAP = {
  first_name: (lead) => (lead.name || '').split(' ')[0] || '',
  last_name:  (lead) => (lead.name || '').split(' ').slice(1).join(' ') || '',
  full_name:  (lead) => lead.name || '',
  email:      (lead) => lead.email || '',
  phone:      (lead) => lead.phone || '',
  country:    (lead) => lead.country || '',
  biggest_struggle: (lead) => lead.roadblock || '',
  would_invest:     (lead) => lead.would_invest || '',
  bothered:   (lead) => lead.bothered_score != null ? String(lead.bothered_score) : '',
  age:        (lead) => lead.age != null ? String(lead.age) : '',
}

export function renderTemplate(template, lead) {
  if (!template) return ''
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key) => {
    const fn = VARIABLE_MAP[key.toLowerCase()]
    if (!fn) return match // unknown variable — leave it untouched
    const value = fn(lead || {})
    return value || ''
  })
}