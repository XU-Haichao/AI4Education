# 批量更新页面脚本
import os
import re

os.chdir(r'c:\Users\epiphyllum\OneDrive\Projects\ai4teaching\relativity')

pages = [
    'pages/special-relativity/mass-energy.html',
    'pages/special-relativity/twin-paradox.html',
    'pages/general-relativity/equivalence.html',
    'pages/general-relativity/spacetime-curvature.html',
    'pages/general-relativity/gravitational-lensing.html',
    'pages/general-relativity/black-holes.html',
    'pages/general-relativity/gravitational-waves.html',
]

# 旧编辑器模式
old_editor_pattern = r'<div class="editor-modal" id="editor-modal">.*?</div>\s*</div>\s*</div>'
old_scripts = '<script src="../../js/app.js"></script>'
new_scripts = '''<script src="../../js/media-manager.js"></script>
    <script src="../../js/editor-injector.js"></script>
    <script src="../../js/page-editor-helper.js"></script>
    <script src="../../js/app.js"></script>'''

for filepath in pages:
    print(f'处理: {filepath}')
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 移除旧编辑器
    content = re.sub(old_editor_pattern, '<!-- 编辑器由 editor-injector.js 动态注入 -->', content, flags=re.DOTALL)
    
    # 添加新脚本引用
    if 'media-manager.js' not in content:
        content = content.replace(old_scripts, new_scripts)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ 完成')

print('\n所有HTML页面更新完成！')
