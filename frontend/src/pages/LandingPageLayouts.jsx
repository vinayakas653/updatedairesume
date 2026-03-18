import { Outlet, useLocation } from "react-router-dom";
import Aichat from "../pages/Aichat";

export default function LandingPageLayout() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      <Outlet />
      {!isAdmin && <Aichat />}
    </>
  );
}
