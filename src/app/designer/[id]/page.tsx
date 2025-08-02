"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";

// Import UI components from shadcn/ui
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  FileCode,
  ZoomIn,
  ZoomOut,
  Grid,
  Download,
  Shirt,
  Square,
} from "lucide-react";

// Main Designer Page Component
export default function DesignerPage({}: { params: Promise<{ id: string }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState({ zoom: 1, showGrid: true });

  // Updated state to handle separate G-code for each piece
  const [gcodeResults, setGcodeResults] = useState({
    text: "",
    front: "",
    back: "",
    sleeve: "",
  });

  const [isGenerating, setIsGenerating] = useState({
    text: false,
    front: false,
    back: false,
    sleeve: false,
  });

  // T-Shirt Properties State
  const [tshirt, setTshirt] = useState({
    size: "M",
    style: "classic",
    designName: "New T-Shirt Design",
  });

  // Text Design Properties State
  const [text, setText] = useState({
    content: "SAMPLE TEXT",
    fontFamily: "Arial",
    color: "#000000",
    isBold: false,
    isItalic: false,
    align: "center" as CanvasTextAlign,
    position: { x: 400, y: 250 },
    scale: 100,
    rotation: 0,
  });

  // Machine & Cutting Properties State
  const [machine, setMachine] = useState({
    type: "laser" as "laser" | "dragKnife",
    ipAddress: "192.168.8.130",
    isSending: false,
    sendStatus: "",
    materialThickness: 0.5,
    cuttingSpeed: 2000,
    cuttingDepth: 0.6,
  });

  // Main canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (view.showGrid) drawGrid(ctx, canvas.width, canvas.height);
    drawTshirtPattern(ctx, tshirt.size, tshirt.style);
    drawRulers(ctx, canvas.width, canvas.height);
  });


  // G-CODE GENERATION FUNCTIONS FOR EACH PIECE
  const generatePieceGcode = async (pieceType:"front" | "back" | "sleeve") => {
    setIsGenerating((prev) => ({ ...prev, [pieceType]: true }));
    setGcodeResults((prev) => ({
      ...prev,
      [pieceType]: "Generating, please wait...",
    }));

    try {
      const response = await fetch("/api/gcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: machine.ipAddress,
          pieceType: pieceType, // This is the key addition
          tshirtSize: tshirt.size,
          tshirtStyle: tshirt.style,
          textContent: text.content,
          textPosition: text.position,
          textScale: text.scale,
          textRotation: text.rotation,
          textFont: text.fontFamily,
          textBold: text.isBold,
          textItalic: text.isItalic,
          textAlign: text.align,
          textColor: text.color,
          material: "cotton",
          thickness: machine.materialThickness,
          speed: machine.cuttingSpeed,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setGcodeResults((prev) => ({
          ...prev,
          [pieceType]: `Error: ${data.error || "Unknown error"}`,
        }));
      } else {
        setGcodeResults((prev) => ({
          ...prev,
          [pieceType]: data.gcode || "No G-code returned.",
        }));
      }
    } catch (err) {
      setGcodeResults((prev) => ({
        ...prev,
        [pieceType]: `Network error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }));
    }

    setIsGenerating((prev) => ({ ...prev, [pieceType]: false }));
  };

  //text G-code generation
   const generateTextGcode = async (pieceType: "text") => {
    setIsGenerating((prev) => ({ ...prev, [pieceType]: true }));
    setGcodeResults((prev) => ({
      ...prev,
      [pieceType]: "Generating, please wait...",
    }));

    try {
      const response = await fetch("/api/servo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: machine.ipAddress,
          pieceType: pieceType, // This is the key addition
          tshirtSize: tshirt.size,
          tshirtStyle: tshirt.style,
          textContent: text.content,
          textPosition: text.position,
          textScale: text.scale,
          textRotation: text.rotation,
          textFont: text.fontFamily,
          textBold: text.isBold,
          textItalic: text.isItalic,
          textAlign: text.align,
          textColor: text.color,
          material: "cotton",
          thickness: machine.materialThickness,
          speed: machine.cuttingSpeed,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setGcodeResults((prev) => ({
          ...prev,
          [pieceType]: `Error: ${data.error || "Unknown error"}`,
        }));
      } else {
        setGcodeResults((prev) => ({
          ...prev,
          [pieceType]: data.gcode || "No G-code returned.",
        }));
      }
    } catch (err) {
      setGcodeResults((prev) => ({
        ...prev,
        [pieceType]: `Network error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }));
    }

    setIsGenerating((prev) => ({ ...prev, [pieceType]: false }));
  };

  // Download G-code for specific piece
  const handleDownloadGcode = (pieceType:"text" | "front" | "back" | "sleeve") => {
    const gcode = gcodeResults[pieceType];
    if (!gcode || gcode.includes("Error:") || gcode.includes("Generating"))
      return;

    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tshirt.designName.replace(/ /g, "_")}_${pieceType}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get current G-code for display
  const getCurrentGcode = () => {
    const pieces = Object.entries(gcodeResults).filter(
      ([gcode]) =>
        gcode && !gcode.includes("Error:") && !gcode.includes("Generating")
    );

    if (pieces.length === 0) {
      return "Click any piece button to generate G-code...";
    }

    return pieces
      .map(
        ([piece, gcode]) => `; === ${piece.toUpperCase()} PIECE ===\n${gcode}\n`
      )
      .join("\n");
  };

  // Drawing functions (keeping existing ones)
  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 50) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 10) {
      if (x % 50 !== 0) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    }
    for (let y = 0; y <= height; y += 10) {
      if (y % 50 !== 0) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
    }
    ctx.stroke();
  };

  const drawRulers = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.fillStyle = "#1e293b";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";

    for (let x = 50; x <= width; x += 50) {
      ctx.fillText(`${x}mm`, x, 15);
    }

    ctx.save();
    ctx.rotate(-Math.PI / 2);
    for (let y = 50; y <= height; y += 50) {
      ctx.fillText(`${y}mm`, -y, 15);
    }
    ctx.restore();
  };

  const drawTshirtPattern = (
    ctx: CanvasRenderingContext2D,
    size: string,
    style: string
  ) => {
    const dims = getTshirtDimensions(size, style);
    const baseX = 100;
    const baseY = 50;

    ctx.save();
    ctx.translate(baseX, baseY);
    drawTshirtPiece(ctx, "FRONT", dims, "#3b82f6", "#1e40af");
    ctx.restore();

    ctx.save();
    ctx.translate(baseX + dims.width + 80, baseY);
    drawTshirtPiece(ctx, "BACK", dims, "#10b981", "#047857");
    ctx.restore();

    ctx.save();
    ctx.translate(baseX, baseY + dims.length + 80);
    drawSleevePiece(ctx, "LEFT SLEEVE", dims, "#f59e0b", "#d97706");
    ctx.restore();

    ctx.save();
    ctx.translate(baseX + dims.sleeveWidth + 50, baseY + dims.length + 80);
    drawSleevePiece(ctx, "RIGHT SLEEVE", dims, "#f59e0b", "#d97706");
    ctx.restore();

    drawCuttingInstructions(ctx, dims, baseX, baseY);
  };

  const drawTshirtPiece = (
    ctx: CanvasRenderingContext2D,
    label: string,
    dims: ReturnType<typeof getTshirtDimensions>,
    strokeColor: string,
    fillColor: string
  ) => {
    const path = getTshirtPiecePath(label === "FRONT" ? "front" : "back", dims);

    ctx.fillStyle = fillColor + "20";
    ctx.fill(path);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke(path);

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = strokeColor + "80";
    ctx.lineWidth = 1;
    ctx.stroke(path);
    ctx.setLineDash([]);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -20);

    ctx.font = "10px Arial";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`W: ${dims.width.toFixed(0)}mm`, 0, dims.length + 25);
    ctx.fillText(
      `L: ${dims.length.toFixed(0)}mm`,
      dims.width / 2 + 20,
      dims.length / 2
    );
  };

  const drawSleevePiece = (
    ctx: CanvasRenderingContext2D,
    label: string,
    dims: ReturnType<typeof getTshirtDimensions>,
    strokeColor: string,
    fillColor: string
  ) => {
    const path = getSleevePath(dims);

    ctx.fillStyle = fillColor + "20";
    ctx.fill(path);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke(path);

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = strokeColor + "80";
    ctx.lineWidth = 1;
    ctx.stroke(path);
    ctx.setLineDash([]);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -15);

    ctx.font = "10px Arial";
    ctx.fillStyle = "#64748b";
    ctx.fillText(
      `W: ${dims.sleeveWidth.toFixed(0)}mm`,
      0,
      dims.sleeveLength + 20
    );
    ctx.fillText(
      `L: ${dims.sleeveLength.toFixed(0)}mm`,
      dims.sleeveWidth / 2 + 15,
      dims.sleeveLength / 2
    );
  };

  const drawCuttingInstructions = (
    ctx: CanvasRenderingContext2D,
    dims: ReturnType<typeof getTshirtDimensions>,
    baseX: number,
    baseY: number
  ) => {
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    const frontPath = getTshirtPiecePath("front", dims);
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(1.05, 1.05);
    ctx.stroke(frontPath);
    ctx.restore();

    ctx.fillStyle = "#dc2626";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("⚠️ Red dashed line: 5mm seam allowance", 20, 25);

    ctx.fillStyle = "#1e293b";
    ctx.fillText("📐 Cut pieces according to the solid lines", 20, 40);
    ctx.fillText(
      `📏 Total fabric needed: ${(dims.width * 2 + 100).toFixed(0)}mm × ${(
        dims.length +
        dims.sleeveLength +
        150
      ).toFixed(0)}mm`,
      20,
      55
    );

    ctx.setLineDash([]);
  };

  const getTshirtDimensions = (size: string, style: string) => {
    const sizeMultipliers: { [key: string]: number } = {
      XS: 0.85,
      S: 0.92,
      M: 1,
      L: 1.08,
      XL: 1.16,
      XXL: 1.24,
    };
    const styleMultipliers: { [key: string]: number } = {
      classic: 1,
      slim: 0.95,
      oversized: 1.1,
    };
    const sizeMultiplier = sizeMultipliers[size] || 1;
    const styleMultiplier = styleMultipliers[style] || 1;

    return {
      width: 460 * sizeMultiplier * styleMultiplier,
      length: 600 * sizeMultiplier * styleMultiplier,
      neckWidth: 160 * sizeMultiplier * styleMultiplier,
      frontNeckDrop: 80 * sizeMultiplier * styleMultiplier,
      backNeckDrop: 20 * sizeMultiplier * styleMultiplier,
      sleeveLength: 200 * sizeMultiplier * styleMultiplier,
      sleeveWidth: 220 * sizeMultiplier * styleMultiplier,
    };
  };

  const getTshirtPiecePath = (
    piece: "front" | "back",
    dims: ReturnType<typeof getTshirtDimensions>
  ) => {
    const path = new Path2D();
    const neckDrop = piece === "front" ? dims.frontNeckDrop : dims.backNeckDrop;
    const shoulderX = dims.width / 2;
    const shoulderY = 0;
    const armholeY = dims.sleeveWidth * 0.3;
    const bottomY = dims.length;

    path.moveTo(-shoulderX, shoulderY);
    path.lineTo(-shoulderX, armholeY);
    path.bezierCurveTo(
      -shoulderX + 20,
      armholeY + 30,
      -shoulderX + 60,
      armholeY + 40,
      -shoulderX + 80,
      armholeY
    );
    path.lineTo(-dims.width / 2 + 30, bottomY);
    path.lineTo(dims.width / 2 - 30, bottomY);
    path.lineTo(shoulderX - 80, armholeY);
    path.bezierCurveTo(
      shoulderX - 60,
      armholeY + 40,
      shoulderX - 20,
      armholeY + 30,
      shoulderX,
      armholeY
    );
    path.lineTo(shoulderX, shoulderY);
    path.lineTo(dims.neckWidth / 2, shoulderY);
    path.bezierCurveTo(
      dims.neckWidth / 3,
      neckDrop * 0.3,
      dims.neckWidth / 3,
      neckDrop,
      0,
      neckDrop
    );
    path.bezierCurveTo(
      -dims.neckWidth / 3,
      neckDrop,
      -dims.neckWidth / 3,
      neckDrop * 0.3,
      -dims.neckWidth / 2,
      shoulderY
    );
    path.closePath();

    return path;
  };

  const getSleevePath = (dims: ReturnType<typeof getTshirtDimensions>) => {
    const path = new Path2D();
    const w = dims.sleeveWidth;
    const l = dims.sleeveLength;

    path.moveTo(-w / 2, 0);
    path.bezierCurveTo(-w / 3, -30, -w / 6, -40, 0, -35);
    path.bezierCurveTo(w / 6, -40, w / 3, -30, w / 2, 0);
    path.lineTo(w / 2 - 20, l);
    path.lineTo(-w / 2 + 20, l);
    path.closePath();

    return path;
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Left Panel: Controls */}
      <div className="w-96 bg-white/70 backdrop-blur-md border-r border-white/20 shadow-xl overflow-y-auto">
        <div className="p-6 border-b border-white/20 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CNC Designer
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            Create precise patterns for CNC cutting
          </p>
        </div>

        <div className="p-4">
          <Tabs defaultValue="tshirt">
            <TabsList className="w-full bg-white/50 backdrop-blur-sm">
              <TabsTrigger
                value="tshirt"
                className="flex-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                T-Shirt
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="flex-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                Text
              </TabsTrigger>
              <TabsTrigger
                value="machine"
                className="flex-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                Machine
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tshirt" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label
                  htmlFor="design-name"
                  className="text-sm font-medium text-gray-700"
                >
                  Design Name
                </Label>
                <Input
                  id="design-name"
                  value={tshirt.designName}
                  onChange={(e) =>
                    setTshirt({ ...tshirt, designName: e.target.value })
                  }
                  className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="tshirt-size"
                  className="text-sm font-medium text-gray-700"
                >
                  T-Shirt Size
                </Label>
                <Select
                  value={tshirt.size}
                  onValueChange={(s) => setTshirt({ ...tshirt, size: s })}
                >
                  <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/90 backdrop-blur-md">
                    {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="hover:bg-blue-50"
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="tshirt-style"
                  className="text-sm font-medium text-gray-700"
                >
                  T-Shirt Style
                </Label>
                <Select
                  value={tshirt.style}
                  onValueChange={(s) => setTshirt({ ...tshirt, style: s })}
                >
                  <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/90 backdrop-blur-md">
                    <SelectItem value="classic" className="hover:bg-blue-50">
                      Classic Fit
                    </SelectItem>
                    <SelectItem value="slim" className="hover:bg-blue-50">
                      Slim Fit
                    </SelectItem>
                    <SelectItem value="oversized" className="hover:bg-blue-50">
                      Oversized
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Text Content
                </Label>
                <Textarea
                  value={text.content}
                  onChange={(e) =>
                    setText({ ...text, content: e.target.value })
                  }
                  placeholder="Your Text Here"
                  rows={3}
                  className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Font Size
                  </Label>
                  <Input
                    type="number"
                    value={text.scale}
                    onChange={(e) =>
                      setText({ ...text, scale: parseInt(e.target.value) })
                    }
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Rotation
                  </Label>
                  <Input
                    type="number"
                    value={text.rotation}
                    onChange={(e) =>
                      setText({ ...text, rotation: parseInt(e.target.value) })
                    }
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="machine" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Machine Type
                </Label>
                <Select
                  value={machine.type}
                  onValueChange={(t) =>
                    setMachine({ ...machine, type: t as "laser" | "dragKnife" })
                  }
                >
                  <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/90 backdrop-blur-md">
                    <SelectItem value="laser" className="hover:bg-blue-50">
                      Laser Cutter
                    </SelectItem>
                    <SelectItem value="dragKnife" className="hover:bg-blue-50">
                      Drag Knife
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Thickness (mm)
                  </Label>
                  <Input
                    type="number"
                    value={machine.materialThickness}
                    step="0.1"
                    onChange={(e) =>
                      setMachine({
                        ...machine,
                        materialThickness: parseFloat(e.target.value),
                      })
                    }
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Speed (mm/min)
                  </Label>
                  <Input
                    type="number"
                    value={machine.cuttingSpeed}
                    step="50"
                    onChange={(e) =>
                      setMachine({
                        ...machine,
                        cuttingSpeed: parseInt(e.target.value),
                      })
                    }
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Cutting Depth (mm)
                </Label>
                <Input
                  type="number"
                  value={machine.cuttingDepth}
                  step="0.1"
                  onChange={(e) =>
                    setMachine({
                      ...machine,
                      cuttingDepth: parseFloat(e.target.value),
                    })
                  }
                  className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Center Panel: Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex-none bg-white/70 backdrop-blur-md border-b border-white/20 shadow-lg p-4 flex justify-between items-center">
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => generateTextGcode("text")}
              disabled={isGenerating.text}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
            >
              <FileCode className="mr-2 h-4 w-4" />
              {isGenerating.text ? "Generating..." : "Text G-code"}
            </Button>
            {/* Three separate buttons for each piece */}
            <Button
              variant="default"
              onClick={() => generatePieceGcode("front")}
              disabled={isGenerating.front}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            >
              <Shirt className="mr-2 h-4 w-4" />
              {isGenerating.front ? "Generating..." : "Front"}
            </Button>

            <Button
              variant="default"
              onClick={() => generatePieceGcode("back")}
              disabled={isGenerating.back}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
            >
              <Shirt className="mr-2 h-4 w-4" />
              {isGenerating.back ? "Generating..." : "Back"}
            </Button>

            <Button
              variant="default"
              onClick={() => generatePieceGcode("sleeve")}
              disabled={isGenerating.sleeve}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg"
            >
              <Square className="mr-2 h-4 w-4" />
              {isGenerating.sleeve ? "Generating..." : "Sleeve"}
            </Button>
          </div>

          <div className="flex gap-2">
            {/* Download buttons for each piece */}
            <Button
              variant="outline"
              onClick={() => handleDownloadGcode("front")}
              disabled={
                !gcodeResults.front ||
                gcodeResults.front.includes("Error:") ||
                gcodeResults.front.includes("Generating")
              }
              className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
            >
              <Download className="mr-2 h-4 w-4" /> Front
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownloadGcode("back")}
              disabled={
                !gcodeResults.back ||
                gcodeResults.back.includes("Error:") ||
                gcodeResults.back.includes("Generating")
              }
              className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
            >
              <Download className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownloadGcode("sleeve")}
              disabled={
                !gcodeResults.sleeve ||
                gcodeResults.sleeve.includes("Error:") ||
                gcodeResults.sleeve.includes("Generating")
              }
              className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
            >
              <Download className="mr-2 h-4 w-4" /> Sleeve
            </Button>
          </div>

          <div className="flex gap-2 items-center bg-white/50 backdrop-blur-sm rounded-lg p-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setView({ ...view, showGrid: !view.showGrid })}
              className="bg-white/50 backdrop-blur-sm border-white/30"
            >
              <Grid
                className={`h-4 w-4 ${view.showGrid ? "text-blue-600" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setView({ ...view, zoom: Math.max(0.2, view.zoom - 0.2) })
              }
              className="bg-white/50 backdrop-blur-sm border-white/30"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center font-medium text-gray-700">
              {Math.round(view.zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setView({ ...view, zoom: Math.min(3, view.zoom + 0.2) })
              }
              className="bg-white/50 backdrop-blur-sm border-white/30"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 overflow-auto p-6">
          <div
            style={{
              transform: `scale(${view.zoom})`,
              transformOrigin: "top left",
            }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={1000}
              className="bg-white shadow-2xl rounded-lg border border-white/20"
            />
          </div>
        </div>
      </div>

      {/* Right Panel: G-code Viewer */}
      <div className="w-96 bg-gray-900/90 backdrop-blur-md text-white font-mono flex flex-col shadow-xl">
        <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">G-code Preview</span>
          </div>
        </div>
        <pre className="flex-1 p-4 text-xs overflow-auto whitespace-pre-wrap bg-gray-900/50">
          {getCurrentGcode()}
        </pre>
      </div>
    </div>
  );
}
