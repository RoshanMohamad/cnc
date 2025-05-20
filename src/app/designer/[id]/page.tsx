"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import {
  Save,
  FileCode,
  Send,
  Type,
  Move,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Grid,
  Download,
  RotateCw,
  Maximize,
  Minimize,
  Bold,
  Italic,
  AlignCenter,
  AlignLeft,
  AlignRight,
} from "lucide-react";

export default function DesignerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState("select");
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [gcode, setGcode] = useState("");
  const [id, setId] = useState<string | null>(null);
  // New state for machine interaction
  const [machineId, setMachineId] = useState("192.168.8.130"); // Default or get from user/config
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  // T-shirt properties
  const [tshirtSize, setTshirtSize] = useState("M");
  const [tshirtStyle, setTshirtStyle] = useState("classic");

  // Text design properties
  const [textContent, setTextContent] = useState("SAMPLE TEXT");
  const [textPosition, setTextPosition] = useState({ x: 400, y: 250 });
  const [textScale, setTextScale] = useState(100);
  const [textRotation, setTextRotation] = useState(0);
  const [textFont, setTextFont] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textAlign, setTextAlign] = useState("center");

  // Default sizes quick selection
  const defaultSizes = ["XS", "S", "M", "L", "XL", "XXL"];

  useEffect(() => {
    // Check if the ID is valid
    params.then((resolvedParams) => {
      setId(resolvedParams.id);
    });
  }, [params]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found.");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get 2D context from canvas.");
      return;
    }

    if (canvas.width <= 0 || canvas.height <= 0) {
      console.error("Canvas dimensions are invalid.");
      return;
    }

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw t-shirt outline based on selected size
    drawTshirtOutline(ctx, tshirtSize, tshirtStyle);

    // Draw text design
    drawTextDesign(
      ctx,
      textContent,
      textPosition,
      textScale,
      textRotation,
      textFont,
      textColor,
      textBold,
      textItalic,
      textAlign
    );
  }, [
    showGrid,
    tshirtSize,
    tshirtStyle,
    textContent,
    textPosition,
    textScale,
    textRotation,
    textFont,
    textColor,
    textBold,
    textItalic,
    textAlign,
  ]);

  // Draw grid helper
  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  // Draw t-shirt outline based on size
  const drawTshirtOutline = (
    ctx: CanvasRenderingContext2D,
    size: string,
    style: string
  ) => {
    // Size multipliers
    const sizeMultipliers: { [key: string]: number } = {
      XS: 0.9,
      S: 0.95,
      M: 1,
      L: 1.05,
      XL: 1.1,
      XXL: 1.15,
    };

    const multiplier = sizeMultipliers[size] || 1;

    // Style adjustments
    const styleAdjustments: {
      [key: string]: { width: number; length: number; neckSize: number };
    } = {
      classic: { width: 1, length: 1, neckSize: 1 },
      slim: { width: 0.9, length: 1.05, neckSize: 0.9 },
      oversized: { width: 1.2, length: 0.95, neckSize: 1.1 },
    };

    const styleAdj = styleAdjustments[style] || styleAdjustments.classic;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;

    // Base dimensions
    const baseWidth = 300 * multiplier * styleAdj.width;
    const baseLength = 350 * multiplier * styleAdj.length;
    const neckSize = 50 * multiplier * styleAdj.neckSize;

    // Center position
    const centerX = 400;
    const topY = 100;

    // Neck
    ctx.beginPath();
    ctx.arc(centerX, topY, neckSize, Math.PI / 64, Math.PI);
    ctx.stroke();

    // Shoulders and body
    ctx.beginPath();
    ctx.moveTo(centerX - neckSize, topY);
    ctx.arcTo(
      centerX - baseWidth / 2,
      topY + 50,
      centerX - baseWidth / 2,
      topY + baseLength,
      20
    ); // Left shoulder rounded
    ctx.lineTo(centerX - baseWidth / 2, topY + baseLength);
    ctx.lineTo(centerX + baseWidth / 2, topY + baseLength);
    ctx.arcTo(centerX + baseWidth / 2, topY + 50, centerX + neckSize, topY, 20); // Right shoulder rounded
    ctx.lineTo(centerX + neckSize, topY);
    ctx.stroke();

    // Left sleeve
    // ctx.beginPath()
    // ctx.moveTo(centerX - baseWidth / 2, topY + 50)
    // ctx.lineTo(centerX - baseWidth / 2 - 100, topY + 150)
    // ctx.lineTo(centerX - baseWidth  - 50, topY + 150)
    // ctx.lineTo(centerX - baseWidth / 2, topY + 100)
    // ctx.stroke()

    // // Right sleeve
    // ctx.beginPath()
    // ctx.moveTo(centerX + baseWidth / 2, topY + 50)
    // ctx.lineTo(centerX + baseWidth / 2 + 100, topY + 150)
    // ctx.lineTo(centerX + baseWidth / 2 + 50, topY + 150)
    // ctx.lineTo(centerX + baseWidth / 2, topY + 100)
    // ctx.stroke()

    // Add size label
    ctx.fillStyle = "#000000";
    ctx.font = "16px sans-serif";
    ctx.fillText(
      `Size: ${size} (${style})`,
      centerX - 60,
      topY + baseLength + 30
    );
  };

  // Draw text design
  const drawTextDesign = (
    ctx: CanvasRenderingContext2D,
    text: string,
    position: { x: number; y: number },
    scale: number,
    rotation: number,
    font: string,
    color: string,
    bold: boolean,
    italic: boolean,
    align: string
  ) => {
    ctx.save();

    // Move to position, then rotate and scale
    ctx.translate(position.x, position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    const scaleFactor = scale / 100;
    ctx.scale(scaleFactor, scaleFactor);

    // Set text properties
    const fontStyle = `${italic ? "italic " : ""}${
      bold ? "bold " : ""
    }${Math.round(36 * scaleFactor)}px ${font}, sans-serif`;
    ctx.font = fontStyle;
    ctx.fillStyle = color;
    ctx.textAlign = align as CanvasTextAlign;

    // Draw text
    const lines = text.split("\n");
    const lineHeight = 40;

    lines.forEach((line, index) => {
      const yOffset = (index - (lines.length - 1) / 2) * lineHeight;
      ctx.fillText(line, 0, yOffset);
    });

    // Draw bounding box (for visualization)
    const maxLineWidth = Math.max(
      ...lines.map((line) => ctx.measureText(line).width)
    );
    const textHeight = lines.length * lineHeight;
    const boxPadding = 10;

    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    let boxX = 0;
    if (align === "left") boxX = maxLineWidth / 2;
    else if (align === "right") boxX = -maxLineWidth / 2;

    ctx.strokeRect(
      boxX - maxLineWidth / 2 - boxPadding,
      -textHeight / 2 + lineHeight / 2 - boxPadding,
      maxLineWidth + boxPadding * 2,
      textHeight + boxPadding * 2
    );
    ctx.setLineDash([]);

    ctx.restore();
  };

  // Generate G-code from the pattern
  const generateGcode = () => {
    // This is a simplified example of G-code generation for a t-shirt with text
    const sizeMultipliers: { [key: string]: number } = {
      XS: 0.9,
      S: 0.95,
      M: 1,
      L: 1.05,
      XL: 1.1,
      XXL: 1.15,
    };

    const multiplier = sizeMultipliers[tshirtSize] || 1;

    const styleAdjustments: {
      [key: string]: { width: number; length: number };
    } = {
      classic: { width: 1, length: 1 },
      slim: { width: 0.9, length: 1.05 },
      oversized: { width: 1.2, length: 0.95 },
    };

    const styleAdj = styleAdjustments[tshirtStyle] || styleAdjustments.classic;

    // Base dimensions in mm
    const baseWidth = 600 * multiplier * styleAdj.width;
    const baseLength = 700 * multiplier * styleAdj.length;
    const neckSize = 100 * multiplier;

    const sampleGcode = `; T-ShirtCraft G-code for ${tshirtStyle} T-shirt, Size ${tshirtSize}
; Generated on ${new Date().toLocaleString()}
; Text design: "${textContent}"
; Font: ${textFont} ${textBold ? "Bold" : ""} ${textItalic ? "Italic" : ""}

G21 ; Set units to millimeters
G90 ; Set to absolute positioning
G92 X0 Y0 Z0 ; Set current position as origin

; Cutting speed and depth
F1000 ; Set feed rate
Z5 ; Raise cutter

; Start with neck
G0 X400 Y100 ; Move to start position
Z0 ; Lower cutter
G2 X${400 - neckSize} Y100 I-${neckSize} J0 ; Cut neck curve (clockwise arc)

; Left shoulder and side
G1 X${400 - baseWidth / 2} Y150 ; Cut to left shoulder
G1 X${400 - baseWidth / 2} Y${100 + baseLength} ; Cut down left side

; Bottom
G1 X${400 + baseWidth / 2} Y${100 + baseLength} ; Cut across bottom

; Right side and shoulder
G1 X${400 + baseWidth / 2} Y150 ; Cut up right side
G1 X${400 + neckSize} Y100 ; Cut to right shoulder

; Complete neck
G2 X400 Y100 I-${neckSize} J0 ; Complete neck curve

; Left sleeve
G0 X${400 - baseWidth / 2} Y150 ; Move to left shoulder
Z0 ; Lower cutter
G1 X${400 - baseWidth / 2 - 200} Y250 ; Cut sleeve outer edge
G1 X${400 - baseWidth / 2 - 100} Y250 ; Cut sleeve bottom
G1 X${400 - baseWidth / 2} Y200 ; Cut sleeve inner edge

; Right sleeve
G0 X${400 + baseWidth / 2} Y150 ; Move to right shoulder
Z0 ; Lower cutter
G1 X${400 + baseWidth / 2 + 200} Y250 ; Cut sleeve outer edge
G1 X${400 + baseWidth / 2 + 100} Y250 ; Cut sleeve bottom
G1 X${400 + baseWidth / 2} Y200 ; Cut sleeve inner edge

; Mark text area for printing
G0 Z5 ; Raise cutter
G0 X${textPosition.x} Y${textPosition.y} ; Move to text center position
Z1 ; Lower marker slightly

; Text marking instructions for printing machine
; Text: "${textContent}"
; Position: X${textPosition.x} Y${textPosition.y}
; Scale: ${textScale}%
; Rotation: ${textRotation}°
; Font: ${textFont} ${textBold ? "Bold" : ""} ${textItalic ? "Italic" : ""}
; Color: ${textColor}
; Alignment: ${textAlign}

; End
G0 Z10 ; Raise cutter
G0 X0 Y0 ; Return to origin
M2 ; End program`;

    setGcode(sampleGcode);
  };

  // Handle text position change
  const moveTextDesign = (dx: number, dy: number) => {
    setTextPosition({
      x: textPosition.x + dx,
      y: textPosition.y + dy,
    });
  };

  // Handle sending G-code to the machine via the backend API
  const handleSendToMachine = async () => {
    if (!gcode) {
      alert("Please generate G-code first.");
      return;
    }
    if (!machineId) {
      alert("Please enter a Machine ID (e.g., ESP32 IP Address).");
      return;
    }

    setIsSending(true);
    setSendStatus("Sending G-code...");

    try {
      // Construct the URL using the machineId from state
      // Ensure your ESP32 is listening on /api/gcode or adjust the path accordingly
      const res = await fetch(`http://${machineId}/api/gcode`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: gcode, // Send the actual generated G-code
      });

      const responseText = await res.text(); // Get response from machine
      if (!res.ok) {
        throw new Error(`Machine responded with ${res.status}: ${responseText}`);
      }
      setSendStatus(`Successfully sent to ${machineId}. Machine says: ${responseText}`);
      console.log("Machine response:", responseText);
    } catch (err) {
      console.error("Fetch failed:", err);
      setSendStatus(`Error sending to ${machineId}: ${'error'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {id === "new" ? "New T-Shirt Design" : `Editing: T-Shirt ${id}`}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={generateGcode}>
            <FileCode className="mr-2 h-4 w-4" />
            Generate G-code
          </Button>
          <Button onClick={handleSendToMachine} disabled={isSending || !gcode}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? "Sending..." : "Send to Machine"}
          </Button>
        </div>
      </div>

      {/* Default sizes quick selection */}
      <div className="mb-6">
        <Label className="mb-2 block">Quick Size Selection</Label>
        <div className="flex flex-wrap gap-2">
          {defaultSizes.map((size) => (
            <Button
              key={size}
              variant={tshirtSize === size ? "default" : "outline"}
              onClick={() => setTshirtSize(size)}
              className="w-16"
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      {/* Machine ID Input and Status */}
      <div className="mb-6 p-4 border rounded-lg bg-card">
        <Label htmlFor="machine-id" className="mb-2 block font-medium">
          Target Machine ID (ESP32 IP)
        </Label>
        <Input
          id="machine-id"
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          placeholder="e.g., 192.168.1.100"
          className="mb-2"
          disabled={isSending}
        />
        {sendStatus && (
          <p
            className={`text-sm ${
              sendStatus.toLowerCase().startsWith("error") || sendStatus.toLowerCase().includes("failed")
                ? "text-red-500"
                : "text-green-500"
            }`}
          >
            {sendStatus}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tool === "select" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setTool("select")}
                    >
                      <Move className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Select</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tool === "text" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setTool("text")}
                    >
                      <Type className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Text</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid className={`h-4 w-4 ${showGrid ? "text-primary" : ""}`} />
              </Button>
              <Button variant="outline" size="icon">
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Redo className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="w-16 text-center flex items-center justify-center">
                {zoom}%
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setZoom(Math.min(200, zoom + 10))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <div
              className="w-full overflow-auto"
              style={{
                height: "calc(100vh - 350px)",
                minHeight: "400px",
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left",
              }}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="cursor-crosshair"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Tabs defaultValue="text">
            <TabsList className="w-full">
              <TabsTrigger value="tshirt" className="flex-1">
                T-Shirt
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-1">
                Text
              </TabsTrigger>
              <TabsTrigger value="gcode" className="flex-1">
                G-code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tshirt" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="design-name">Design Name</Label>
                <Input
                  id="design-name"
                  defaultValue={
                    id === "new" ? "New T-Shirt Design" : `T-Shirt ${id}`
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tshirt-size">T-Shirt Size</Label>
                <Select value={tshirtSize} onValueChange={setTshirtSize}>
                  <SelectTrigger id="tshirt-size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XS">XS</SelectItem>
                    <SelectItem value="S">S</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="XL">XL</SelectItem>
                    <SelectItem value="XXL">XXL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tshirt-style">T-Shirt Style</Label>
                <Select value={tshirtStyle} onValueChange={setTshirtStyle}>
                  <SelectTrigger id="tshirt-style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic Fit</SelectItem>
                    <SelectItem value="slim">Slim Fit</SelectItem>
                    <SelectItem value="oversized">Oversized</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Select defaultValue="cotton">
                  <SelectTrigger id="material">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cotton">100% Cotton</SelectItem>
                    <SelectItem value="cotton-poly">
                      Cotton-Polyester Blend
                    </SelectItem>
                    <SelectItem value="polyester">100% Polyester</SelectItem>
                    <SelectItem value="tri-blend">Tri-Blend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thickness">Material Thickness (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  defaultValue="0.5"
                  step="0.1"
                />
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="text-content">Text Content</Label>
                <Textarea
                  id="text-content"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter your text here"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="text-font">Font</Label>
                  <Select value={textFont} onValueChange={setTextFont}>
                    <SelectTrigger id="text-font">
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times New Roman">
                        Times New Roman
                      </SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                      <SelectItem value="Impact">Impact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text-color"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Text Style</Label>
                <div className="flex gap-2">
                  <Button
                    variant={textBold ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextBold(!textBold)}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={textItalic ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextItalic(!textItalic)}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={textAlign === "left" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign("left")}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={textAlign === "center" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign("center")}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={textAlign === "right" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTextAlign("right")}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Text Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => moveTextDesign(0, -10)}
                  >
                    Up
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => moveTextDesign(0, 10)}
                  >
                    Down
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => moveTextDesign(-10, 0)}
                  >
                    Left
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => moveTextDesign(10, 0)}
                  >
                    Right
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="text-scale" className="text-xs">
                    Text Scale
                  </Label>
                  <span className="text-xs">{textScale}%</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTextScale(Math.max(50, textScale - 10))}
                  >
                    <Minimize className="h-4 w-4" />
                  </Button>
                  <Slider
                    id="text-scale"
                    value={[textScale]}
                    onValueChange={(value) => setTextScale(value[0])}
                    min={50}
                    max={200}
                    step={10}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTextScale(Math.min(200, textScale + 10))}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="text-rotation" className="text-xs">
                    Text Rotation
                  </Label>
                  <span className="text-xs">{textRotation}°</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setTextRotation((textRotation - 15 + 360) % 360)
                    }
                  >
                    <RotateCw className="h-4 w-4 transform -scale-x-100" />
                  </Button>
                  <Slider
                    id="text-rotation"
                    value={[textRotation]}
                    onValueChange={(value) => setTextRotation(value[0])}
                    min={0}
                    max={359}
                    step={15}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTextRotation((textRotation + 15) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gcode" className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium">Generated G-code</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generateGcode}>
                      <FileCode className="mr-2 h-3 w-3" />
                      Generate
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md bg-muted p-2">
                  <pre
                    className="text-xs overflow-auto whitespace-pre"
                    style={{ maxHeight: "400px" }}
                  >
                    {gcode ||
                      "Click 'Generate' to create G-code from your t-shirt design."}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Quick Text Templates */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Quick Text Templates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            "A",
            "B",
            "C",
            "TEAM",
            "2025",
            "CUSTOM TEXT",
            "LOGO HERE",
            "#1",
          ].map((template) => (
            <Card
              key={template}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setTextContent(template)}
            >
              <CardContent className="p-3 text-center">
                <p
                  className={`font-${
                    template === textContent ? "bold" : "normal"
                  }`}
                >
                  {template}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
