'use client'
import Image from "next/image";
import { MenuIcon } from "./icons";
import { useState } from "react";
export default function SideBar()
{
    const [isOpen,setIsOpen]=useState(false)
    return (
        <div className={`absolute grid w-1/5 ${isOpen?"bg-foreground h-screen":"bg-background h-0"} transition-all duration-500 ease-linear `}>
            <div className="grid text-2xl h-fit ml-2">
                <h1 className="font-logo">Study Buddy</h1>
                <button onClick={()=>{setIsOpen((isOpen)=>!isOpen)}}>
                <MenuIcon className={"w-6 h-6 rotate-90 text-coffee"} />
                </button>
            </div>
        </div>
    )
}