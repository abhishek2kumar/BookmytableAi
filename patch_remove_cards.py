import re

with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

# 1. Primary Cover Image
content = content.replace(
    '<div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">\n                     <div className="mb-6">\n                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Primary Cover Image</h3>',
    '<div className="pb-8 border-b border-slate-100">\n                     <div className="mb-6">\n                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Primary Cover Image</h3>'
)

# 2. renderImageInputList
content = content.replace(
    '  const renderImageInputList = (label: string, field: \'secondaryImages\' | \'menuImages\' | \'foodImages\' | \'ambienceImages\', tooltip?: string) => {\n    const isStringArrayOnly = field === \'foodImages\' || field === \'ambienceImages\';\n    return (\n    <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">',
    '  const renderImageInputList = (label: string, field: \'secondaryImages\' | \'menuImages\' | \'foodImages\' | \'ambienceImages\', tooltip?: string) => {\n    const isStringArrayOnly = field === \'foodImages\' || field === \'ambienceImages\';\n    return (\n    <div className="py-8 border-b border-slate-100">'
)

# 3. renderMenuCategories
content = content.replace(
    '  const renderMenuCategories = () => (\n    <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm mt-8">',
    '  const renderMenuCategories = () => (\n    <div className="py-8">'
)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)

