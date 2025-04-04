import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // In a real application, this would process the t-shirt pattern data
    // and generate G-code based on the pattern's geometry and text design

    // For demonstration purposes, we're returning a simple G-code example
    const gcode = generateTshirtGcode(data)

    return NextResponse.json({
      success: true,
      gcode,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to generate G-code" }, { status: 500 })
  }
}

function generateTshirtGcode(data: any) {
  const {
    tshirtSize = "M",
    tshirtStyle = "classic",
    textContent = "SAMPLE TEXT",
    textPosition = { x: 400, y: 250 },
    textScale = 100,
    textRotation = 0,
    textFont = "Arial",
    textBold = false,
    textItalic = false,
    textAlign = "center",
    textColor = "#000000",
    material = "cotton",
    thickness = 0.5,
    speed = 1000,
  } = data

  // Size multipliers
  const sizeMultipliers: { [key: string]: number } = {
    XS: 0.9,
    S: 0.95,
    M: 1,
    L: 1.05,
    XL: 1.1,
    XXL: 1.15,
  }

  const multiplier = sizeMultipliers[tshirtSize] || 1

  // Style adjustments
  const styleAdjustments: { [key: string]: { width: number; length: number } } = {
    classic: { width: 1, length: 1 },
    slim: { width: 0.9, length: 1.05 },
    oversized: { width: 1.2, length: 0.95 },
  }

  const styleAdj = styleAdjustments[tshirtStyle] || styleAdjustments.classic

  // Base dimensions in mm
  const baseWidth = 600 * multiplier * styleAdj.width
  const baseLength = 700 * multiplier * styleAdj.length
  const neckSize = 100 * multiplier

  return `; T-ShirtCraft G-code for ${tshirtStyle} T-shirt, Size ${tshirtSize}
; Generated on ${new Date().toLocaleString()}
; Material: ${material}
; Thickness: ${thickness}mm
; Text design: "${textContent}"
; Font: ${textFont} ${textBold ? "Bold" : ""} ${textItalic ? "Italic" : ""}
; Color: ${textColor}

G21 ; Set units to millimeters
G90 ; Set to absolute positioning
G92 X0 Y0 Z0 ; Set current position as origin

; Cutting speed and depth
F${speed} ; Set feed rate
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
M2 ; End program`
}

