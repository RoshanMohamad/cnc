import sys
import json
from svg2gcode import svg2gcode
import tempfile
import os

def convert_svg_to_gcode(svg_content, params):
    try:
        # Create temporary SVG file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.svg', delete=False) as temp_svg:
            temp_svg.write(svg_content)
            temp_svg_path = temp_svg.name

        # Convert SVG to G-code
        gcode_lines = svg2gcode(
            svg_file=temp_svg_path,
            dpi=params.get('dpi', 96),
            feed_rate=params.get('feed_rate', 1000),
            seek_rate=params.get('seek_rate', 3000),
            cut_depth=params.get('cut_depth', 1),
            safe_height=params.get('safe_height', 3),
            tool_diameter=params.get('tool_diameter', 0.1),
            tolerance=params.get('tolerance', 0.1),
            passes=params.get('passes', 1)
        )

        # Clean up temporary file
        os.unlink(temp_svg_path)

        # Join G-code lines
        gcode = '\n'.join(gcode_lines)
        
        return {
            'success': True,
            'gcode': gcode
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    
    result = convert_svg_to_gcode(
        input_data['svg_content'], 
        input_data['params']
    )
    
    print(json.dumps(result))