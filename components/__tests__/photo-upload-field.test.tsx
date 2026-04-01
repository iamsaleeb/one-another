jest.mock('@/lib/uploadthing', () => ({
  UploadDropzone: ({ onClientUploadComplete, onUploadError, content }: {
    onClientUploadComplete: (res: Array<{ ufsUrl: string }>) => void
    onUploadError: (error: { message: string }) => void
    content?: { label?: string }
  }) => (
    <div data-testid="upload-dropzone">
      <span>{content?.label ?? 'Upload'}</span>
      <button
        data-testid="simulate-upload"
        onClick={() => onClientUploadComplete([{ ufsUrl: 'https://utfs.io/f/uploaded.jpg' }])}
      >
        Simulate Upload
      </button>
      <button
        data-testid="simulate-error"
        onClick={() => onUploadError({ message: 'Upload failed' })}
      >
        Simulate Error
      </button>
    </div>
  ),
}))

jest.mock('@/lib/actions/upload', () => ({
  deleteUploadedFileAction: jest.fn().mockResolvedValue(undefined),
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhotoUploadField } from '@/components/photo-upload-field'
import { deleteUploadedFileAction } from '@/lib/actions/upload'

const mockDeleteUploadedFileAction = deleteUploadedFileAction as jest.Mock

describe('PhotoUploadField', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the dropzone when no value is provided', () => {
    render(<PhotoUploadField value={undefined} onChange={jest.fn()} />)
    expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument()
  })

  it('shows the "Add Cover Photo" label in the dropzone', () => {
    render(<PhotoUploadField value={undefined} onChange={jest.fn()} />)
    expect(screen.getByText('Add Cover Photo')).toBeInTheDocument()
  })

  it('renders the image preview when a value is provided', () => {
    render(<PhotoUploadField value="https://utfs.io/f/photo.jpg" onChange={jest.fn()} />)
    const img = screen.getByRole('img', { name: 'Cover photo' })
    expect(img).toBeInTheDocument()
  })

  it('does not render the dropzone when a value is provided', () => {
    render(<PhotoUploadField value="https://utfs.io/f/photo.jpg" onChange={jest.fn()} />)
    expect(screen.queryByTestId('upload-dropzone')).not.toBeInTheDocument()
  })

  it('calls onChange with undefined and deletes from the server when remove is clicked', async () => {
    const onChange = jest.fn()
    render(<PhotoUploadField value="https://utfs.io/f/photo.jpg" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(undefined)
    await waitFor(() => {
      expect(mockDeleteUploadedFileAction).toHaveBeenCalledWith('https://utfs.io/f/photo.jpg')
    })
  })

  it('switches to the dropzone immediately when remove is clicked', () => {
    render(<PhotoUploadField value="https://utfs.io/f/photo.jpg" onChange={jest.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('upload-dropzone')).toBeInTheDocument()
  })

  it('calls onChange with the uploaded URL on successful upload', () => {
    const onChange = jest.fn()
    render(<PhotoUploadField value={undefined} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('simulate-upload'))
    expect(onChange).toHaveBeenCalledWith('https://utfs.io/f/uploaded.jpg')
  })

  it('displays an error message when upload fails', () => {
    render(<PhotoUploadField value={undefined} onChange={jest.fn()} />)
    fireEvent.click(screen.getByTestId('simulate-error'))
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })

  it('clears the error after a successful upload', () => {
    render(<PhotoUploadField value={undefined} onChange={jest.fn()} />)
    fireEvent.click(screen.getByTestId('simulate-error'))
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('simulate-upload'))
    expect(screen.queryByText('Upload failed')).not.toBeInTheDocument()
  })
})
