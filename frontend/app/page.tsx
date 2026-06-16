import InputField from "./components/inputField";
import SideBar from "./components/sideBar";
import { AddIcon, MenuIcon, SearchIcon } from "./components/icons";
import "./globals.css";
export default function Home() {

  
  return (
    <div className="grid h-screen w-screen bg-background">
      <SideBar/>
      <div className="flex flex-col justify-center w-full items-center">
        <h1 className="text-center text-2xl mb-2 font-bold text-coffee ">
          Hello,{" "}
        </h1>
        <InputField />
        <div className="flex p-4 gap-2">
          <button className="flex rounded-full border border-coffee px-2 py-1 items-center text-coffee bg-foreground">
            <AddIcon className={"w-4 h-4"} />
            <h1>Add Files</h1>
          </button>
          <button className="flex rounded-full border border-coffee px-2 py-1 items-center text-coffee bg-foreground">
            <SearchIcon className={"w-4 h-4"} />
            <h1>Search Files</h1>
          </button>
        </div>
      </div>
    </div>
  );
}
