import { visit } from 'unist-util-visit'

const forbiddenNodeTypes = new Set([
  'mdxjsEsm',
  'mdxFlowExpression',
  'mdxTextExpression',
])

const componentAttributes = {
  Callout: ['type', 'title'],
  Spoiler: ['summary'],
  ImageGrid: ['columns'],
  GithubCard: ['repo'],
}

const createTextElement = (tagName, value, properties = {}) => ({
  type: 'textDirective',
  name: tagName,
  attributes: {},
  children: [{ type: 'text', value }],
  data: {
    hName: tagName,
    hProperties: properties,
  },
})

const createContainer = (name, tagName, properties, children) => ({
  type: 'containerDirective',
  name,
  attributes: {},
  children,
  data: {
    hName: tagName,
    hProperties: properties,
    controlledMdxBlock: true,
  },
})

const readAttributes = (node) => {
  const allowedNames = componentAttributes[node.name]
  const values = {}

  for (const attribute of node.attributes) {
    if (
      attribute.type !== 'mdxJsxAttribute' ||
      typeof attribute.name !== 'string' ||
      typeof attribute.value !== 'string'
    ) {
      throw new Error('MDX imports, exports, and expressions are not allowed')
    }
    if (!allowedNames.includes(attribute.name) || attribute.name in values) {
      throw new Error(
        `Invalid MDX component <${node.name}>: unsupported or duplicate attribute "${attribute.name}"`,
      )
    }
    values[attribute.name] = attribute.value
  }

  for (const name of allowedNames) {
    if (values[name]?.trim() === '') {
      throw new Error(
        `Invalid MDX component <${node.name}>: "${name}" must be a non-empty string`,
      )
    }
  }

  return values
}

const assertExactAttributes = (node, values) => {
  const missingName = componentAttributes[node.name].find(
    (name) => values[name] === undefined,
  )
  if (missingName !== undefined) {
    throw new Error(
      `Invalid MDX component <${node.name}>: missing "${missingName}"`,
    )
  }
}

const isImageChild = (node) => {
  if (node.type === 'image' || node.type === 'imageReference') {
    return true
  }
  return (
    node.type === 'paragraph' &&
    node.children.length > 0 &&
    node.children.every(
      (child) =>
        child.type === 'image' ||
        child.type === 'imageReference' ||
        (child.type === 'text' && child.value.trim() === ''),
    )
  )
}

const createCallout = (node, attributes) => {
  if (!/^[a-z][a-z0-9-]*$/.test(attributes.type)) {
    throw new Error(
      'Invalid MDX component <Callout>: "type" must be a safe token',
    )
  }

  return createContainer(
    'callout',
    'blockquote',
    {
      className: ['mdx-callout', `mdx-callout-${attributes.type}`],
      dataCalloutType: attributes.type,
    },
    [
      createTextElement('strong', attributes.title, {
        className: ['mdx-callout-title'],
      }),
      ...node.children,
    ],
  )
}

const createSpoiler = (node, attributes) =>
  createContainer(
    'spoiler',
    'details',
    { className: ['mdx-spoiler'] },
    [createTextElement('summary', attributes.summary), ...node.children],
  )

const createImageGrid = (node, attributes) => {
  if (!/^[1-6]$/.test(attributes.columns)) {
    throw new Error(
      'Invalid MDX component <ImageGrid>: "columns" must be between 1 and 6',
    )
  }
  if (node.children.length === 0 || !node.children.every(isImageChild)) {
    throw new Error(
      'Invalid MDX component <ImageGrid>: only Markdown images are allowed',
    )
  }

  return createContainer(
    'image-grid',
    'figure',
    {
      className: ['mdx-image-grid'],
      dataColumns: attributes.columns,
    },
    node.children,
  )
}

const createGithubCard = (node, attributes) => {
  const segments = attributes.repo.split('/')
  const [owner = '', repository = ''] = segments
  const validOwner =
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner)
  const validRepository =
    /^[A-Za-z0-9._-]+$/.test(repository) &&
    repository !== '.' &&
    repository !== '..' &&
    !repository.endsWith('.')

  if (
    segments.length !== 2 ||
    !validOwner ||
    !validRepository ||
    node.children.length > 0
  ) {
    throw new Error(
      'Invalid MDX component <GithubCard>: expected an empty owner/repository card',
    )
  }

  return createContainer(
    'github-card',
    'figure',
    {
      className: ['mdx-github-card'],
      dataRepo: attributes.repo,
    },
    [
      {
        type: 'link',
        url: `https://github.com/${attributes.repo}`,
        children: [{ type: 'text', value: attributes.repo }],
      },
    ],
  )
}

const convertComponent = (node, parent) => {
  if (!Object.hasOwn(componentAttributes, node.name)) {
    throw new Error(`Unsupported MDX component: ${node.name ?? 'fragment'}`)
  }
  if (
    node.type === 'mdxJsxTextElement' &&
    (parent.type !== 'paragraph' || parent.children.length !== 1)
  ) {
    throw new Error(
      `Invalid MDX component <${node.name}>: block components must use flow syntax`,
    )
  }

  const attributes = readAttributes(node)
  assertExactAttributes(node, attributes)

  if (node.name === 'Callout') return createCallout(node, attributes)
  if (node.name === 'Spoiler') return createSpoiler(node, attributes)
  if (node.name === 'ImageGrid') return createImageGrid(node, attributes)
  return createGithubCard(node, attributes)
}

const transformChildren = (parent) => {
  if (!Array.isArray(parent.children)) return

  for (const child of parent.children) {
    transformChildren(child)
  }
  parent.children = parent.children.map((child) =>
    child.type === 'mdxJsxFlowElement' || child.type === 'mdxJsxTextElement'
      ? convertComponent(child, parent)
      : child,
  )

  parent.children = parent.children.flatMap((child) => {
    if (
      child.type !== 'paragraph' ||
      !child.children.some(
        (nested) => nested.data?.controlledMdxBlock === true,
      )
    ) {
      return [child]
    }
    if (
      child.children.length !== 1 ||
      child.children[0].data?.controlledMdxBlock !== true
    ) {
      throw new Error(
        'Invalid MDX component: block components must not share a paragraph',
      )
    }
    return child.children
  })
}

const applyBasicDirectiveStructure = (tree) => {
  visit(tree, (node) => {
    if (
      !['containerDirective', 'leafDirective', 'textDirective'].includes(
        node.type,
      ) ||
      node.data?.hName
    ) {
      return
    }

    const block = node.type !== 'textDirective'
    node.data = {
      hName: block ? 'div' : 'span',
      hProperties: {
        className: ['directive'],
        dataDirective: node.name,
      },
    }
  })
}

export default function remarkControlledMdx() {
  return (tree) => {
    visit(tree, (node) => {
      if (forbiddenNodeTypes.has(node.type)) {
        throw new Error(
          'MDX imports, exports, and expressions are not allowed',
        )
      }
    })

    transformChildren(tree)
    applyBasicDirectiveStructure(tree)
  }
}
