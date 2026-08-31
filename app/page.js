import { readPanelData } from "../lib/panel-data";
import DisplayPanel from "./display-panel";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await readPanelData();
  return <DisplayPanel initialData={data} />;
}
