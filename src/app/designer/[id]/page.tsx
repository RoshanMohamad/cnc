"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
// Assuming opentype.js is installed (`npm install opentype.js`)
// and you have a font file available in your public folder.

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

import { FileCode, ZoomIn, ZoomOut, Grid, Download } from "lucide-react";

// Main Designer Page Component
export default function DesignerPage({}: { params: Promise<{ id: string }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const [font, setFont] = useState<opentype.Font | null>(null);
  // const [machineId, setMachineId] = useState<string | null>(null)
  const [view, setView] = useState({ zoom: 1, showGrid: true });
  const [gcode, setGcode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
    position: { x: 400, y: 250 }, // Position in mm
    scale: 100, // Percentage
    rotation: 0, // Degrees
  });

  // Machine & Cutting Properties State
  const [machine, setMachine] = useState({
    type: "laser" as "laser" | "dragKnife",
    ipAddress: "192.168.8.130",
    isSending: false,
    sendStatus: "",
    materialThickness: 0.5, // in mm
    cuttingSpeed: 2000, // mm/min
    cuttingDepth: 0.6, // in mm (should be >= thickness)
  });

  // Main canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Clear and prepare canvas with better background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid with better styling
    if (view.showGrid) drawGrid(ctx, canvas.width, canvas.height);

    // Draw T-Shirt Patterns with enhanced styling
    drawTshirtPattern(ctx, tshirt.size, tshirt.style);

    // Draw rulers/measurements
    drawRulers(ctx, canvas.width, canvas.height);
  });

  // --- ENHANCED DRAWING FUNCTIONS ---

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Major grid lines (every 50mm)
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

    // Minor grid lines (every 10mm)
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

    // Top ruler
    for (let x = 50; x <= width; x += 50) {
      ctx.fillText(`${x}mm`, x, 15);
    }

    // Left ruler
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

    // Base position for the pattern
    const baseX = 100;
    const baseY = 50;

    // Draw Front Piece with enhanced styling
    ctx.save();
    ctx.translate(baseX, baseY);
    drawTshirtPiece(ctx, "FRONT", dims, "#3b82f6", "#1e40af");
    ctx.restore();

    // Draw Back Piece
    ctx.save();
    ctx.translate(baseX + dims.width + 80, baseY);
    drawTshirtPiece(ctx, "BACK", dims, "#10b981", "#047857");
    ctx.restore();

    // Draw Left Sleeve
    ctx.save();
    ctx.translate(baseX, baseY + dims.length + 80);
    drawSleevePiece(ctx, "LEFT SLEEVE", dims, "#f59e0b", "#d97706");
    ctx.restore();

    // Draw Right Sleeve
    ctx.save();
    ctx.translate(baseX + dims.sleeveWidth + 50, baseY + dims.length + 80);
    drawSleevePiece(ctx, "RIGHT SLEEVE", dims, "#f59e0b", "#d97706");
    ctx.restore();

    // Draw cutting lines and annotations
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

    // Fill with semi-transparent color
    ctx.fillStyle = fillColor + "20";
    ctx.fill(path);

    // Stroke with solid color
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke(path);

    // Add dotted cutting line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = strokeColor + "80";
    ctx.lineWidth = 1;
    ctx.stroke(path);
    ctx.setLineDash([]);

    // Add label
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -20);

    // Add dimensions
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

    // Fill with semi-transparent color
    ctx.fillStyle = fillColor + "20";
    ctx.fill(path);

    // Stroke with solid color
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke(path);

    // Add dotted cutting line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = strokeColor + "80";
    ctx.lineWidth = 1;
    ctx.stroke(path);
    ctx.setLineDash([]);

    // Add label
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -15);

    // Add dimensions
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
    // Add seam allowances indicators
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Front piece seam allowance
    ctx.beginPath();
    const frontPath = getTshirtPiecePath("front", dims);
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(1.05, 1.05); // 5mm seam allowance
    ctx.stroke(frontPath);
    ctx.restore();

    // Add cutting instructions text
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

  // --- DRAWING FUNCTIONS ---

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
    // Base dimensions in mm for a Medium Classic-Fit
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

    // Start from left shoulder
    path.moveTo(-shoulderX, shoulderY);

    // Left side down to armhole
    path.lineTo(-shoulderX, armholeY);

    // Armhole curve (left)
    path.bezierCurveTo(
      -shoulderX + 20,
      armholeY + 30,
      -shoulderX + 60,
      armholeY + 40,
      -shoulderX + 80,
      armholeY
    );

    // Side seam to bottom
    path.lineTo(-dims.width / 2 + 30, bottomY);

    // Bottom hem
    path.lineTo(dims.width / 2 - 30, bottomY);

    // Right side seam
    path.lineTo(shoulderX - 80, armholeY);

    // Armhole curve (right)
    path.bezierCurveTo(
      shoulderX - 60,
      armholeY + 40,
      shoulderX - 20,
      armholeY + 30,
      shoulderX,
      armholeY
    );

    // Right shoulder
    path.lineTo(shoulderX, shoulderY);

    // Neck opening
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

    // Sleeve cap (top curve)
    path.moveTo(-w / 2, 0);
    path.bezierCurveTo(-w / 3, -30, -w / 6, -40, 0, -35);
    path.bezierCurveTo(w / 6, -40, w / 3, -30, w / 2, 0);

    // Right side seam
    path.lineTo(w / 2 - 20, l);

    // Bottom hem
    path.lineTo(-w / 2 + 20, l);

    path.closePath();
    return path;
  };

  // --- G-CODE GENERATION ---

  const generateGcode = async () => {
    setIsGenerating(true);
    setGcode("Generating, please wait...");

    try {
      // Send request to your Next.js API route
      const response = await fetch("/api/gcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: machine.ipAddress, // Use the IP from your state
          tshirtSize: tshirt.size,
          tshirtStyle: tshirt.style,
          // You can add more fields if needed, e.g. textContent, etc.
          // For now, only sending the required ones for pattern cutting
          thickness: machine.materialThickness,
          speed: machine.cuttingSpeed,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setGcode(`Error: ${data.error || "Unknown error"}`);
      } else {
        setGcode(data.gcode || "No G-code returned.");
      }
    } catch (err) {
      setGcode(
        `Network error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    setIsGenerating(false);
  };

  // This is a placeholder for a complex function. A real implementation would be more involved.
  // const generatePieceGcode = (
  //   name: string,
  //   path: Path2D,
  //   position: { x: number; y: number },
  //   zCut: number,
  //   zSafe: number,
  //   speed: number
  // ) => {
  //   // This function would ideally decompose the Path2D object. Since that's not trivial,
  //   // we'll regenerate the path with G-code commands as a stand-in.
  //   // This is a conceptual representation.
  //   let g = `\n(${name})\n`;
  //   g += `G0 X${position.x.toFixed(3)} Y${position.y.toFixed(3)}\n`;
  //   g += `G1 Z${zCut.toFixed(3)} F${speed / 2}\n`; // Plunge
  //   g += `G1 F${speed}\n`;
  //   g += `; ... path commands would be generated here ...\n`;
  //   g += `G0 Z${zSafe.toFixed(3)}\n`; // Retract
  //   return g;
  // };

  const handleDownloadGcode = () => {
    if (!gcode) return;
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tshirt.designName.replace(/ /g, "_")}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- RENDER ---
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
              onClick={generateGcode}
              disabled={isGenerating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <FileCode className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate G-code"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadGcode}
              disabled={!gcode}
              className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70"
            >
              <Download className="mr-2 h-4 w-4" /> Download
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
          {gcode || "Click 'Generate G-code' to see the output here."}
        </pre>
      </div>
    </div>
  );
}
