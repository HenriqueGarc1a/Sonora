import { VERSION } from "../../../shared/constants";

export function AppFooter(): any {
  return <footer><span>v{VERSION.replace(/\.0$/, "")}</span></footer>;
}
