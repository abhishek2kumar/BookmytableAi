import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Modify Vite creation
content = content.replace(
"""  // Vite middleware for development
  if (useVite) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {""",
"""  let vite: any;
  // Vite middleware for development
  if (useVite) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {""")

# 2. Un-nest app.get('*')
content = content.replace(
"""    }));
    
    app.get('*', async (req, res) => {""",
"""    }));
  }
    
  app.get('*', async (req, res) => {""")

# 3. Use Vite for html rendering
content = content.replace(
"""        let htmlString = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');""",
"""        let htmlString = '';
        if (useVite) {
           htmlString = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
           htmlString = await vite.transformIndexHtml(req.originalUrl, htmlString);
        } else {
           htmlString = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf-8');
        }""")

# 4. Remove the trailing brace for the else block
content = content.replace(
"""      } catch (err) {
        console.error(err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }""",
"""      } catch (err) {
        console.error(err);
        if (useVite) {
           res.sendFile(path.join(process.cwd(), 'index.html'));
        } else {
           res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
        }
      }
    });""")

with open('server.ts', 'w') as f:
    f.write(content)
