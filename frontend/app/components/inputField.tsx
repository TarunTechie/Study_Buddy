'use client'
import { SendIcon } from "@/app/components/icons"
import { backendApi } from "../services/backendApi";

export default function InputField()
{
    async function callBackend()
      {
        try {
          const results = await backendApi.get('/')
          console.log(results)
        }
        catch (error) {
          console.error(error)
        }
      }
    return (
        <div className="flex border border-coffee w-1/2 items-center rounded-full justify-between p-2">
            <input type='text' className="outline-0 rounded-full h-full w-full px-2 text-coffee " />
            <button onClick={callBackend}>
                <SendIcon className={"w-auto h-6"} />
            </button>
        </div>
    )
}