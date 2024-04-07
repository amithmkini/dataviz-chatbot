import { useRef, type RefObject } from 'react'

type KeyDownEvent = React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>;

export function useEnterSubmit(): {
  formRef: RefObject<HTMLFormElement>
  onKeyDown: (event: KeyDownEvent) => void
} {
  const formRef = useRef<HTMLFormElement>(null)

  const handleKeyDown = (
    event: KeyDownEvent
  ): void => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      formRef.current?.requestSubmit()
      event.preventDefault()
    }
  }

  return { formRef, onKeyDown: handleKeyDown }
}
