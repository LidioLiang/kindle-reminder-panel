import { readPanelData } from "../../lib/panel-data";
import AdminPanel from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await readPanelData();
  return <AdminPanel initialData={data} />;
}
