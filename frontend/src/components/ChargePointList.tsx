import React, { useEffect, useState } from "react";
import { List, ListItem, ListItemText, Button, Stack } from "@mui/material";
import axios from "axios";

type CP = { id: number; identity: string; status: string };

export default function ChargePointList() {
  const [cps, setCps] = useState<CP[]>([]);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    const res = await axios.get("/api/chargepoints");
    setCps(res.data);
  }

  async function send(cp: CP, command: string) {
    await axios.post(`/api/chargepoints/${cp.identity}/command`, { command });
    fetchList();
  }

  return (
    <List>
      {cps.map((cp) => (
        <ListItem key={cp.identity} divider>
          <ListItemText
            primary={cp.identity}
            secondary={`Status: ${cp.status}`}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => send(cp, "AVAILABLE")}>
              Set Available
            </Button>
            <Button variant="outlined" onClick={() => send(cp, "CHARGING")}>
              Start Charging
            </Button>
          </Stack>
        </ListItem>
      ))}
    </List>
  );
}
