'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { submitFeedback } from '@/app/feedback/actions'
import { FeedbackSchema } from '@/lib/utils'

import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroupItem, RadioGroup } from "@/components/ui/radio-group"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { IconSpinner } from '@/components/ui/icons'
import { Separator } from "@/components/ui/separator"
import { z } from 'zod'

type FeedbackData = z.infer<typeof FeedbackSchema>;

type RadioQuestion = {
  question: string;
  id: keyof FeedbackData;
};

const radioGroupQuestions: RadioQuestion[] = Object.keys(FeedbackSchema.shape)
  .filter(key => key !== 'otherFeedback')  // Assuming you might still want to exclude 'otherFeedback'
  .map(key => ({
    question: FeedbackSchema.shape[key as keyof FeedbackData]._def.description as string,
    id: key as keyof FeedbackData
  }));

export function Feedback() {

  const router = useRouter()
  const [result, dispatch] = useFormState(submitFeedback, undefined)

  useEffect(() => {
    if (result) {
      if (result.type === 'error') {
        toast.error(result.message)
      } else {
        toast.success(result.message)
        router.replace('/new')
        router.refresh()
      }
    }
  }, [result, router])

  return (
    <div className="group w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[300px] duration-300 ease-in-out animate-in-out pt-4 md:pt-10">
      <form
        action={dispatch}
      >
        <Card className="mx-auto sm:max-w-xl sm:px-4 h-[80vh]">
          <CardHeader>
            <CardTitle>User Feedback</CardTitle>
            <CardDescription>
              Please provide your feedback on the following questions.
              1 - Strongly disagree, 2 - Disagree, 3 - Neither agree nor disagree, 4 - Agree, 5 - Strongly agree
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[calc(80vh-220px)] overflow-auto">
              <div
                className="space-y-6 mr-4"
              >
                {radioGroupQuestions.map((question, index) => (
                  <>
                    <div key={index} className="space-y-2">
                      <Label htmlFor={question.id} className="">{question.question}</Label>
                      <RadioGroup required className="flex flex-row justify-between" name={question.id}>
                        <RadioGroupItem id={question.id + '-1'} value="1">1</RadioGroupItem>
                        <Label htmlFor={question.id + '-1'}>1</Label>
                        <RadioGroupItem id={question.id + '-2'} value="2">2</RadioGroupItem>
                        <Label htmlFor={question.id + '-2'}>2</Label>
                        <RadioGroupItem id={question.id + '-3'} value="3">3</RadioGroupItem>
                        <Label htmlFor={question.id + '-3'}>3</Label>
                        <RadioGroupItem id={question.id + '-4'} value="4">4</RadioGroupItem>
                        <Label htmlFor={question.id + '-4'}>4</Label>
                        <RadioGroupItem id={question.id + '-5'} value="5">5</RadioGroupItem>
                        <Label htmlFor={question.id + '-5'}>5</Label>
                      </RadioGroup>
                    </div>
                    <Separator/>
                  </>
                ))}
                <div className="space-y-2 pb-2">
                  <Label htmlFor="otherFeedback">Other feedback</Label>
                  <Textarea
                    className="min-h-[100px] mx-1"
                    id="otherFeedback"
                    placeholder="Please share any other feedback you have"
                    name="otherFeedback"
                  />
                </div>
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button className="w-full" type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? <IconSpinner /> : 'Submit'}
    </Button>
  )
}