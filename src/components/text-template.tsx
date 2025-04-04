"use client"
import { Card, CardContent } from "@/components/ui/card"

interface TextTemplateProps {
  templates: string[]
  selectedTemplate: string
  onSelectTemplate: (template: string) => void
}

export function TextTemplate({ templates, selectedTemplate, onSelectTemplate }: TextTemplateProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">Quick Text Templates</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {templates.map((template) => (
          <Card
            key={template}
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
              template === selectedTemplate ? "border-primary" : ""
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            <CardContent className="p-3 text-center">
              <p className={`${template === selectedTemplate ? "font-bold" : "font-normal"}`}>{template}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

