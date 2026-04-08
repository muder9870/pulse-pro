import logging
from typing import Dict, List

log = logging.getLogger("style_mapper")

class StyleMapper:
    """Maps article context to artistic visual styles for image generation."""
    
    DEFAULT_STYLE = "professional high-quality photography, 4k, cinematic lighting"
    
    # Category to Style mapping
    CATEGORY_STYLES = {
        "research": "clean minimalist laboratory setting, blue and white color palette, professional scientific photography",
        "arxiv": "abstract architectural representation of data, mathematical nodes, sophisticated 3D visualization, hyper-realistic",
        "github": "high-tech cyberpunk workstation, glowing code on screens, neon accents, cinematic depth of field",
        "reddit": "vibrant pop-art style, energetic colors, clean lines, modern vector illustration",
        "gmail": "sophisticated newsletter aesthetic, soft morning light, elegant desktop setup, professional and clean",
        "tech": "futuristic 3D render, sleek metallic surfaces, integrated circuitry, glowing blue highlights",
        "viral": "dynamic high-energy layout, bold contrasting colors, eye-catching visual impact, cinematic motion blur"
    }
    
    # Keyword to Style mapping for more specificity
    KEYWORD_STYLES = {
        "robotics": "industrial robotic arm, precision mechanics, hyper-detailed metallic textures",
        "llm": "abstract brain made of light particles and data streams, sophisticated neural network visualization",
        "web3": "futuristic blockchain nodes, translucent geometric structures, glowing interconnected network",
        "security": "cybersecurity command center, data encryption visualization, sleek dark UI aesthetic"
    }

    def get_style_suffix(self, category: str = None, title: str = "") -> str:
        """Return a style suffix for a prompt based on category and title keywords."""
        category = (category or "").lower()
        title = (title or "").lower()
        
        # 1. Check Keywords first (more specific)
        for kw, style in self.KEYWORD_STYLES.items():
            if kw in title:
                return f", {style}"
        
        # 2. Check Category
        if category in self.CATEGORY_STYLES:
            return f", {self.CATEGORY_STYLES[category]}"
            
        # 3. Fallback to default
        return f", {self.DEFAULT_STYLE}"

style_mapper = StyleMapper()
