import { NextResponse, NextRequest } from "next/server";
export async function GET(req: NextRequest)
{
    const name = req.nextUrl.searchParams.get('name')
    console.log(name)
    return NextResponse.json({"msg":"Hello"})
}