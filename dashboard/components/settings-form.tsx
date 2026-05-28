"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Save, Key, Cpu, Columns3, Clock, FolderOpen, Copy,
  Heart, Sparkles, FlaskConical, Play, AlertCircle, CheckCircle2,
  AtSign,
} from "lucide-react";
import { toast } from "sonner";
import type { SettingsData, HeartbeatStatus } from "@/lib/types";

interface SettingsFormProps {
  settings: SettingsData;
  onRefresh: () => void;
  soulContent: string;
  onSoulRefresh: () => void;
  heartbeat: HeartbeatStatus | null;
  onHeartbeatRefresh: () => void;
}

export function SettingsForm({
  settings,
  onRefresh,
  soulContent,
  onSoulRefresh,
  heartbeat,
  onHeartbeatRefresh,
}: SettingsFormProps) {
  const [keys, setKeys] = useState({
    anthropicKey: "",
    xBearerToken: "",
    twitterUsername: "",
    twitterPassword: "",
  });
  const [myHandle, setMyHandle] = useState(settings.myHandle || "");
  const [model, setModel] = useState(settings.model);
  const [customModel, setCustomModel] = useState("");
  const [pillars, setPillars] = useState<string[]>(settings.pillars);
  const [heartbeatConfig, setHeartbeatConfig] = useState(settings.heartbeatConfig);
  const [saving, setSaving] = useState<string | null>(null);

  // Soul state
  const [soulText, setSoulText] = useState(soulContent);
  const [soulSaving, setSoulSaving] = useState(false);

  // A/B toggle state (default ON)
  const [abTest, setAbTest] = useState(true);

  useEffect(() => {
    setMyHandle(settings.myHandle || "");
    setModel(settings.model);
    setPillars(settings.pillars);
    setHeartbeatConfig(settings.heartbeatConfig);
  }, [settings]);

  useEffect(() => {
    setSoulText(soulContent);
  }, [soulContent]);

  const saveSection = async (section: string, data: object) => {
    setSaving(section);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      onRefresh();
      toast.success(`${section} saved`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleSoulSave = async () => {
    setSoulSaving(true);
    try {
      await fetch("/api/soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: soulText }),
      });
      onSoulRefresh();
      toast.success("Soul saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSoulSaving(false);
    }
  };

  const handleLearn = async () => {
    try {
      await fetch("/api/run/learn", { method: "POST" });
      toast.success("Learn pass started — soul.md will update from feedback");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRunDue = async () => {
    try {
      const res = await fetch("/api/heartbeat/run", { method: "POST" });
      const data = await res.json();
      toast.success(`Started ${data.ran?.length || 0} task(s)`);
      onHeartbeatRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const knownModels = ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"];
  const isCustomModel = !knownModels.includes(model);
  const soulHasChanges = soulText !== soulContent;
  const dueTasks = heartbeat?.tasks.filter((t) => t.isDue) || [];

  return (
    <div className="space-y-6">
      {/* My Twitter Handle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AtSign className="h-4 w-4 text-apple-blue" />
            My Twitter Handle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-gray-2 mb-3">
            Your X/Twitter handle. Used to scrape your own tweets for voice matching and performance tracking.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-1 font-medium">@</span>
            <Input
              placeholder="dylanworr"
              value={myHandle}
              onChange={(e) => setMyHandle(e.target.value.replace(/^@/, ""))}
            />
            <button
              onClick={() => saveSection("Handle", { myHandle })}
              disabled={saving === "Handle"}
              className="glass-interactive glass-tint-green rounded-xl h-8 px-4 text-[12px] font-medium text-apple-blue inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </CardContent>
      </Card>

      {/* A/B Testing Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-apple-purple" />
            A/B Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={abTest}
              onCheckedChange={(v) => setAbTest(!!v)}
            />
            <div>
              <p className="text-sm text-[#F5F5F7] font-medium">Enable A/B Variations</p>
              <p className="text-[11px] text-gray-1 mt-0.5">Generate original + 2 variations for each content piece</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-2 mt-3">
            When enabled, Generate and Daily commands will produce A/B test variants alongside originals.
          </p>
        </CardContent>
      </Card>

      {/* Soul / Style Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-apple-pink" />
              Soul / Style Guide
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLearn}
                className="glass-interactive rounded-xl h-7 px-3 text-[11px] font-medium text-gray-1 hover:text-white inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-3 w-3" />
                Learn from Feedback
              </button>
              <button
                onClick={handleSoulSave}
                disabled={soulSaving || !soulHasChanges}
                className="glass-interactive glass-tint-green rounded-xl h-7 px-3 text-[11px] font-medium text-apple-blue inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <Save className="h-3 w-3" />
                Save
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={soulText}
            onChange={(e) => setSoulText(e.target.value)}
            className="font-mono text-sm min-h-[300px] resize-y"
            placeholder="Your style guide content..."
          />
          <p className="text-[11px] text-gray-2 mt-2">
            Define your voice so every post sounds like you. Click &quot;Learn from Feedback&quot; to auto-update from your feedback history.
          </p>
        </CardContent>
      </Card>

      {/* Heartbeat Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-apple-teal" />
              Heartbeat Status
            </CardTitle>
            {dueTasks.length > 0 && (
              <button
                onClick={handleRunDue}
                className="glass-interactive glass-tint-green rounded-xl h-7 px-3 text-[11px] font-medium text-apple-blue inline-flex items-center gap-1.5"
              >
                <Play className="h-3 w-3" />
                Run Due ({dueTasks.length})
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {heartbeat ? (
            <div className="space-y-2">
              {heartbeat.tasks.map((task) => (
                <div
                  key={task.name}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl glass-interactive"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-3.5 w-3.5 text-gray-2" />
                    <div>
                      <p className="text-sm font-medium text-[#E5E5EA] capitalize">{task.name}</p>
                      <p className="text-[10px] text-gray-2">
                        {task.nextWindow} &middot; Every {task.intervalHours}h
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-3">
                      {task.lastRun ? new Date(task.lastRun).toLocaleString() : "Never"}
                    </span>
                    {task.isDue ? (
                      <div className="inline-flex items-center gap-1 glass-tint-gold rounded-lg px-2 py-0.5 text-[10px] font-semibold text-apple-orange">
                        <AlertCircle className="h-2.5 w-2.5" />
                        DUE
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 glass-tint-apple-green rounded-lg px-2 py-0.5 text-[10px] font-semibold text-apple-green">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        OK
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {heartbeat.lastCheck && (
                <p className="text-[10px] text-gray-3 pt-1">
                  Last check: {new Date(heartbeat.lastCheck).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-2">Loading heartbeat status...</p>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-apple-orange" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "anthropicKey" as const, label: "ANTHROPIC_API_KEY", isSet: settings.keys.anthropicKey },
            { key: "xBearerToken" as const, label: "X_BEARER_TOKEN", isSet: settings.keys.xBearerToken },
            { key: "twitterUsername" as const, label: "TWITTER_USERNAME", isSet: settings.keys.twitterUsername },
            { key: "twitterPassword" as const, label: "TWITTER_PASSWORD", isSet: settings.keys.twitterPassword },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-[11px] text-gray-1 mb-1">{item.label}</Label>
                <Input
                  type="password"
                  placeholder={item.isSet ? "••••••••" : "Not set"}
                  value={keys[item.key]}
                  onChange={(e) => setKeys({ ...keys, [item.key]: e.target.value })}
                />
              </div>
              <div className={`mt-5 inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${
                item.isSet
                  ? "glass-tint-apple-green text-apple-green"
                  : "glass-tint-red text-apple-red"
              }`}>
                {item.isSet ? "Set" : "Not set"}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              const updates: Record<string, string> = {};
              if (keys.anthropicKey) updates.anthropicKey = keys.anthropicKey;
              if (keys.xBearerToken) updates.xBearerToken = keys.xBearerToken;
              if (keys.twitterUsername) updates.twitterUsername = keys.twitterUsername;
              if (keys.twitterPassword) updates.twitterPassword = keys.twitterPassword;
              if (Object.keys(updates).length > 0) {
                saveSection("API Keys", { keys: updates });
                setKeys({ anthropicKey: "", xBearerToken: "", twitterUsername: "", twitterPassword: "" });
              }
            }}
            disabled={saving === "API Keys"}
            className="glass-interactive glass-tint-green rounded-xl h-8 px-4 text-[12px] font-medium text-apple-blue inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Save Keys
          </button>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-apple-indigo" />
            Model Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={isCustomModel ? "custom" : model}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") {
                setModel(customModel || "");
              } else {
                setModel(v);
              }
            }}
          >
            <SelectOption value="claude-sonnet-4-6">claude-sonnet-4-6 (default)</SelectOption>
            <SelectOption value="claude-opus-4-6">claude-opus-4-6</SelectOption>
            <SelectOption value="claude-haiku-4-5">claude-haiku-4-5</SelectOption>
            <SelectOption value="custom">Custom...</SelectOption>
          </Select>
          {(isCustomModel || model === "") && (
            <Input
              placeholder="Custom model ID..."
              value={isCustomModel ? model : customModel}
              onChange={(e) => {
                setCustomModel(e.target.value);
                setModel(e.target.value);
              }}
            />
          )}
          <button
            onClick={() => saveSection("Model", { model })}
            disabled={saving === "Model" || !model}
            className="glass-interactive glass-tint-green rounded-xl h-8 px-4 text-[12px] font-medium text-apple-blue inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            Save Model
          </button>
        </CardContent>
      </Card>

      {/* Content Pillars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Columns3 className="h-4 w-4 text-apple-green" />
            Content Pillars
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pillars.map((pillar, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={pillar}
                onChange={(e) => {
                  const updated = [...pillars];
                  updated[i] = e.target.value;
                  setPillars(updated);
                }}
              />
              <button
                className="glass-interactive glass-tint-red rounded-xl h-8 px-3 text-[12px] font-medium text-apple-red shrink-0"
                onClick={() => setPillars(pillars.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setPillars([...pillars, ""])}
              className="glass-interactive rounded-xl h-8 px-3 text-[12px] font-medium text-gray-1 hover:text-white"
            >
              Add Pillar
            </button>
            <button
              onClick={() => saveSection("Pillars", { pillars: pillars.filter((p) => p.trim()) })}
              disabled={saving === "Pillars"}
              className="glass-interactive glass-tint-green rounded-xl h-8 px-4 text-[12px] font-medium text-apple-blue inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save Pillars
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Heartbeat Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-apple-teal" />
            Heartbeat Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {heartbeatConfig.map((task, i) => (
              <div key={task.name} className="flex items-center gap-3">
                <span className="text-sm font-medium w-20 capitalize text-[#E5E5EA]">{task.name}</span>
                <div className="flex items-center gap-1">
                  <Label className="text-[11px] text-gray-2">Start</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={task.windowStart}
                    onChange={(e) => {
                      const updated = [...heartbeatConfig];
                      updated[i] = { ...task, windowStart: parseInt(e.target.value) || 0 };
                      setHeartbeatConfig(updated);
                    }}
                    className="w-16"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-[11px] text-gray-2">End</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={task.windowEnd}
                    onChange={(e) => {
                      const updated = [...heartbeatConfig];
                      updated[i] = { ...task, windowEnd: parseInt(e.target.value) || 0 };
                      setHeartbeatConfig(updated);
                    }}
                    className="w-16"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-[11px] text-gray-2">Every</Label>
                  <Input
                    type="number"
                    min={1}
                    value={task.intervalHours}
                    onChange={(e) => {
                      const updated = [...heartbeatConfig];
                      updated[i] = { ...task, intervalHours: parseInt(e.target.value) || 1 };
                      setHeartbeatConfig(updated);
                    }}
                    className="w-16"
                  />
                  <span className="text-[11px] text-gray-2">h</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => saveSection("Heartbeat", { heartbeatConfig })}
            disabled={saving === "Heartbeat"}
            className="glass-interactive glass-tint-green rounded-xl h-8 px-4 text-[12px] font-medium text-apple-blue inline-flex items-center gap-1.5 disabled:opacity-50 mt-3"
          >
            <Save className="h-3.5 w-3.5" />
            Save Schedule
          </button>
        </CardContent>
      </Card>

      {/* Data Paths (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4 text-apple-yellow" />
            Data Paths
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Data Root", value: settings.paths.dataRoot },
            { label: "App Dir", value: settings.paths.appDir },
            { label: "Output Dir", value: settings.paths.outputDir },
            { label: "Soul File", value: settings.paths.soulFile },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <span className="text-[11px] text-gray-1">{item.label}</span>
              <div className="flex items-center gap-1">
                <code className="text-[11px] font-mono text-[#E5E5EA] bg-gray-5/60 px-2 py-0.5 rounded-lg">
                  {item.value}
                </code>
                <button
                  className="glass-interactive rounded-lg h-6 w-6 flex items-center justify-center text-gray-2 hover:text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(item.value);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
