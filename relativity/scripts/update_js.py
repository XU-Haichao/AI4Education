# 批量更新JS文件脚本
import os
import re

os.chdir(r'c:\Users\epiphyllum\OneDrive\Projects\ai4teaching\relativity')

# 页面ID和对应的JS文件
pages = [
    ('mass-energy', 'js/simulations/mass-energy.js'),
    ('twin-paradox', 'js/simulations/twin-paradox.js'),
    ('equivalence', 'js/simulations/equivalence.js'),
    ('spacetime-curvature', 'js/simulations/spacetime-curvature.js'),
    ('gravitational-lensing', 'js/simulations/gravitational-lensing.js'),
    ('black-holes', 'js/simulations/black-holes.js'),
    ('gravitational-waves', 'js/simulations/gravitational-waves.js'),
]

# 新的initEditor和loadContent方法模板
def get_new_methods(page_id):
    return f'''    initEditor() {{
        // 使用通用编辑器辅助类
        this.editorHelper = new PageEditorHelper('{page_id}');
        this.editorHelper.initEditor();
    }}

    loadContent() {{
        if (this.editorHelper) {{
            this.editorHelper.loadContent();
        }}
    }}'''

for page_id, filepath in pages:
    print(f'处理: {filepath} (pageId: {page_id})')
    
    if not os.path.exists(filepath):
        print(f'  ⚠️ 文件不存在，跳过')
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已经更新过
    if 'PageEditorHelper' in content:
        print(f'  ✓ 已更新，跳过')
        continue
    
    # 查找并替换 initEditor 和 loadContent 方法
    # 使用更简单的方法：在类中插入新方法
    
    # 首先检查是否有initEditor方法
    if 'initEditor()' in content:
        # 使用正则表达式找到并替换 initEditor 方法
        pattern = r'    initEditor\(\) \{[\s\S]*?\n    \}\n\n    loadContent\(\) \{[\s\S]*?\n    \}'
        new_methods = get_new_methods(page_id)
        
        # 尝试替换
        new_content = re.sub(pattern, new_methods, content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'  ✓ 完成')
        else:
            print(f'  ⚠️ 无法匹配模式，需要手动更新')
    else:
        print(f'  ⚠️ 未找到initEditor方法')

print('\nJS文件更新完成！')
