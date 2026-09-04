const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/

const requireString = (data, field, sourcePath) => {
  const value = data[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${sourcePath}: "${field}" must be a non-empty string`)
  }
  return value.trim()
}

const readOptionalString = (data, field, sourcePath) => {
  const value = data[field]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `${sourcePath}: "${field}" must be a non-empty string when provided`,
    )
  }
  return value.trim()
}

const readOptionalBoolean = (data, field, sourcePath) => {
  const value = data[field]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new Error(`${sourcePath}: "${field}" must be a boolean when provided`)
  }
  return value
}

const isValidDate = (value) => {
  const match = datePattern.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysByMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysByMonth[month - 1]
}

const readDate = (data, field, sourcePath, optional = false) => {
  const value = optional
    ? readOptionalString(data, field, sourcePath)
    : requireString(data, field, sourcePath)

  if (value === undefined) {
    return undefined
  }
  if (!isValidDate(value)) {
    throw new Error(`${sourcePath}: "${field}" must use a valid YYYY-MM-DD date`)
  }
  return value
}

const readHttpUrl = (value, field, sourcePath) => {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${sourcePath}: "${field}" must use an http/https URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${sourcePath}: "${field}" must use an http/https URL`)
  }
  return value
}

const readOptionalUrl = (data, field, sourcePath) => {
  const value = readOptionalString(data, field, sourcePath)
  return value === undefined ? undefined : readHttpUrl(value, field, sourcePath)
}

const requireObject = (data, field, sourcePath) => {
  const value = data[field]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${sourcePath}: "${field}" must be an object when provided`)
  }
  return value
}

const readOptionalNamedLink = (data, field, sourcePath) => {
  if (data[field] === undefined) {
    return undefined
  }

  const value = requireObject(data, field, sourcePath)
  const name = requireString(value, 'name', `${sourcePath}: "${field}"`)
  const urlValue = readOptionalString(value, 'url', `${sourcePath}: "${field}"`)
  const url =
    urlValue === undefined
      ? undefined
      : readHttpUrl(urlValue, `${field}.url`, sourcePath)
  return {
    name,
    ...(url === undefined ? {} : { url }),
  }
}

const readOptionalSource = (data, sourcePath) => {
  if (data.source === undefined) {
    return undefined
  }

  const value = requireObject(data, 'source', sourcePath)
  const title = readOptionalString(value, 'title', `${sourcePath}: "source"`)
  const url = readHttpUrl(
    requireString(value, 'url', `${sourcePath}: "source"`),
    'source.url',
    sourcePath,
  )
  return {
    ...(title === undefined ? {} : { title }),
    url,
  }
}

const readStringArray = (data, field, sourcePath, allowEmpty) => {
  const value = data[field]
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((entry) => typeof entry !== 'string' || entry.trim() === '')
  ) {
    const qualifier = allowEmpty ? 'a string array' : 'a non-empty string array'
    throw new Error(`${sourcePath}: "${field}" must be ${qualifier}`)
  }
  return value.map((entry) => entry.trim())
}

export const parseArticleFrontmatter = (data, sourcePath) => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error(`${sourcePath}: frontmatter must be an object`)
  }

  const title = requireString(data, 'title', sourcePath)
  const slug = requireString(data, 'slug', sourcePath)
  const summary = requireString(data, 'summary', sourcePath)
  const publishedAt = readDate(data, 'publishedAt', sourcePath)
  const category = requireString(data, 'category', sourcePath)
  const tags = readStringArray(data, 'tags', sourcePath, false)
  const updatedAt = readDate(data, 'updatedAt', sourcePath, true)
  const draft = readOptionalBoolean(data, 'draft', sourcePath)
  const pinned = readOptionalBoolean(data, 'pinned', sourcePath)
  const language = readOptionalString(data, 'language', sourcePath)
  const comments = readOptionalBoolean(data, 'comments', sourcePath)
  const author = readOptionalNamedLink(data, 'author', sourcePath)
  const source = readOptionalSource(data, sourcePath)
  const license = readOptionalNamedLink(data, 'license', sourcePath)
  const permalink = readOptionalUrl(data, 'permalink', sourcePath)
  const coverImage = readOptionalString(data, 'coverImage', sourcePath)
  let priority
  let aliases

  if (!slugPattern.test(slug)) {
    throw new Error(
      `${sourcePath}: "slug" must use lowercase letters, numbers, and hyphens`,
    )
  }
  if (data.priority !== undefined) {
    if (!Number.isFinite(data.priority) || !Number.isInteger(data.priority)) {
      throw new Error(
        `${sourcePath}: "priority" must be a finite integer when provided`,
      )
    }
    priority = data.priority
  }
  if (data.aliases !== undefined) {
    aliases = readStringArray(data, 'aliases', sourcePath, true)
  }

  return {
    title,
    slug,
    summary,
    publishedAt,
    category,
    tags,
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(draft === undefined ? {} : { draft }),
    ...(pinned === undefined ? {} : { pinned }),
    ...(priority === undefined ? {} : { priority }),
    ...(language === undefined ? {} : { language }),
    ...(comments === undefined ? {} : { comments }),
    ...(author === undefined ? {} : { author }),
    ...(source === undefined ? {} : { source }),
    ...(license === undefined ? {} : { license }),
    ...(aliases === undefined ? {} : { aliases }),
    ...(permalink === undefined ? {} : { permalink }),
    ...(coverImage === undefined ? {} : { coverImage }),
  }
}
