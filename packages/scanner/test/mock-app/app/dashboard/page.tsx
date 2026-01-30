"use client";

import { Button } from "../../components/button";
import { DashboardStats } from "../../components/dashboard-stats";

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <DashboardStats />
      <Button>Save</Button>
    </div>
  );
}
