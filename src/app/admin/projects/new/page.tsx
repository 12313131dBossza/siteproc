import RoleGate from "@/components/RoleGate";
import PageClient from "./pageClient";
export const dynamic = "force-dynamic";
export default function Page(){ return <RoleGate role="admin"><PageClient/></RoleGate>; }
