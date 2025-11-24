# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - generic [ref=e9]: DockerOCR
    - generic [ref=e10]:
      - button "Show help" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
      - generic "API Key Missing" [ref=e14]: Cloud API
  - main [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]:
        - button "Source" [ref=e19] [cursor=pointer]:
          - img [ref=e20]
          - generic [ref=e22]: Source
        - button "Editor" [disabled] [ref=e23]:
          - img [ref=e24]
          - generic [ref=e26]: Editor
        - button "Process" [disabled] [ref=e27]:
          - img [ref=e28]
          - generic [ref=e30]: Process
        - button "Reset Workspace" [ref=e31] [cursor=pointer]:
          - img [ref=e32]
      - generic [ref=e37] [cursor=pointer]:
        - img [ref=e39]
        - heading "Upload Image" [level=3] [ref=e41]
        - paragraph [ref=e42]: Drag & Drop or Click to Browse
        - paragraph [ref=e43]: PNG, JPG, HEIC
    - generic [ref=e45]:
      - paragraph [ref=e46]: No data extracted yet
      - paragraph [ref=e47]: Upload an image to begin analysis
```