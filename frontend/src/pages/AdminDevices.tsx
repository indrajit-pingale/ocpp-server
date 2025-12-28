import React, { useEffect, useState } from "react";
import {
  TextField,
  Button,
  Paper,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import axios from "axios";

export default function AdminDevices() {
  const [identity, setIdentity] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(
    localStorage.getItem("adminToken")
  );
  const [keys, setKeys] = useState<Array<any>>([]);

  useEffect(() => {
    if (adminToken) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${adminToken}`;
      fetchKeys();
    } else {
      delete axios.defaults.headers.common["Authorization"];
      setKeys([]);
    }
  }, [adminToken]);

  async function fetchKeys() {
    try {
      const res = await axios.get("/api/admin/keys");
      setKeys(res.data || []);
    } catch (e: any) {
      setMsg("Failed to load keys");
    }
  }

  async function createDevice() {
    try {
      await axios.post("/api/devices", { identity, token });
      setMsg("Device created");
      setIdentity("");
      setToken("");
    } catch (e: any) {
      setMsg(e?.response?.data || "error");
    }
  }

  async function loginAdmin() {
    try {
      const res = await axios.post("/api/admin/login", { username, password });
      if (res.data?.token) {
        localStorage.setItem("adminToken", res.data.token);
        setAdminToken(res.data.token);
        axios.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${res.data.token}`;
        setMsg("Logged in");
      } else {
        setMsg("Login failed");
      }
    } catch (e: any) {
      setMsg("Login error");
    }
  }

  async function rotateKey() {
    try {
      const res = await axios.post("/api/admin/keys/rotate");
      setMsg("Rotated keys: " + res.data.kid);
      fetchKeys();
    } catch (e: any) {
      setMsg("Rotate error");
    }
  }

  async function revokeKey(kid: string) {
    try {
      await axios.delete(`/api/admin/keys/${kid}`);
      setMsg("Revoked " + kid);
      fetchKeys();
    } catch (e: any) {
      setMsg("Revoke error");
    }
  }

  return (
    <Paper style={{ padding: 16, marginTop: 16 }}>
      <Typography variant="h6">Admin — Provision Device</Typography>
      <Stack spacing={2} style={{ marginTop: 8 }}>
        <TextField
          label="Identity"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
        />
        <TextField
          label="Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Button variant="contained" onClick={createDevice}>
          Create
        </Button>
        {msg && <Typography variant="body2">{msg}</Typography>}
      </Stack>
      <Stack spacing={2} style={{ marginTop: 16 }}>
        {!adminToken && (
          <>
            <TextField
              label="Admin Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              label="Admin Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button variant="outlined" onClick={loginAdmin}>
              Login
            </Button>
          </>
        )}
        {adminToken && (
          <>
            <Button variant="contained" onClick={createDevice}>
              Create
            </Button>
            <Button variant="outlined" onClick={rotateKey}>
              Rotate Key
            </Button>
            <Typography variant="subtitle1">Signing Keys</Typography>
            <List>
              {keys.map((k) => (
                <ListItem
                  key={k.kid}
                  secondaryAction={
                    <Button onClick={() => revokeKey(k.kid)}>Revoke</Button>
                  }
                >
                  <ListItemText
                    primary={k.kid}
                    secondary={`active: ${k.active} — created: ${new Date(
                      k.createdAt
                    ).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Stack>
    </Paper>
  );
}
