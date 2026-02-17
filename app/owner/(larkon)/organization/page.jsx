"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function OwnerOrganizationAlias(){
 const r=useRouter();
 useEffect(()=>{r.replace("/owner/organizations");},[r]);
 return null;
}
