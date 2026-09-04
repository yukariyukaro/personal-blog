import BlogReaderView from './BlogReaderView'
import { useBlogReaderViewModel } from './hooks/useBlogReaderViewModel'
import './BlogReader.css'

export default function BlogReader() {
  const viewModel = useBlogReaderViewModel()
  return <BlogReaderView viewModel={viewModel} />
}
