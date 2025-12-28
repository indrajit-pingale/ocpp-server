import React from "react";
import { Container, Typography } from "@mui/material";
import ChargePointList from "./components/ChargePointList";
import AdminDevices from "./pages/AdminDevices";

export default function App() {
  return (
    <Container maxWidth="md" style={{ marginTop: 24 }}>
      <Typography variant="h4" gutterBottom>
        OCPP Charge Points
      </Typography>
      <ChargePointList />
      <AdminDevices />
    </Container>
  );
}
