# CSV Formatting Guide - How to Add Colors in Spreadsheet Applications

## Important Note

CSV files are plain text and **cannot store colors or formatting**. However, once you open the CSV in Excel or Google Sheets, you can easily apply colors and formatting which will be saved in the Excel (.xlsx) or Google Sheets format.

## Automated Formatting (Recommended)

### Option 1: Excel - Conditional Formatting (Automatic)

1. **Open the CSV** in Microsoft Excel
2. **Select all data** (Ctrl+A or Cmd+A)
3. Go to **Home → Conditional Formatting → New Rule**
4. Select **"Use a formula to determine which cells to format"**
5. Enter this formula:
   ```
   =MOD(SUMPRODUCT(1/COUNTIF($A$5:$A5,$A$5:$A5)),2)=0
   ```
6. Click **Format** → **Fill** → Choose light blue color
7. Click **OK**

This will automatically apply blue background to every other user's rows.

### Option 2: Google Sheets - Conditional Formatting (Automatic)

1. **Open the CSV** in Google Sheets
2. **Select the data range** (excluding headers)
3. Go to **Format → Conditional formatting**
4. Under "Format cells if", select **Custom formula is**
5. Enter this formula:
   ```
   =MOD(SUMPRODUCT(1/COUNTIF($A$5:$A5,$A$5:$A5)),2)=0
   ```
6. Choose **light blue** as the background color
7. Click **Done**

### Option 3: Excel VBA Macro (Most Powerful)

For recurring use, save this VBA macro in Excel:

```vba
Sub ColorUserRows()
    Dim lastRow As Long
    Dim currentUser As String
    Dim previousUser As String
    Dim colorToggle As Boolean
    Dim i As Long
    
    ' Find the last row with data
    lastRow = Cells(Rows.Count, 1).End(xlUp).Row
    
    ' Start from row 5 (assuming header is on row 4)
    previousUser = ""
    colorToggle = False
    
    For i = 5 To lastRow
        currentUser = Cells(i, 1).Value
        
        ' If user changed, toggle color
        If currentUser <> previousUser And currentUser <> "" Then
            colorToggle = Not colorToggle
            previousUser = currentUser
        End If
        
        ' Apply blue color to alternate users
        If colorToggle Then
            Range(Cells(i, 1), Cells(i, 6)).Interior.Color = RGB(173, 216, 230) ' Light blue
        End If
    Next i
End Sub
```

**How to use:**
1. Open CSV in Excel
2. Press `Alt + F11` to open VBA editor
3. Insert → Module
4. Paste the code above
5. Press `F5` to run
6. Save as `.xlsm` (Excel Macro-Enabled Workbook)

## Manual Formatting (Quick)

### Excel - Manual Selection

1. **Open the CSV** in Excel
2. **Select the rows** for the first user (e.g., rows 5-27 for Faizan Atif)
3. Right-click → **Format Cells** → **Fill** → Choose light blue
4. **Select the rows** for the second user, skip coloring
5. **Select the rows** for the third user, apply light blue
6. Continue alternating for each user

### Google Sheets - Manual Selection

1. **Open the CSV** in Google Sheets
2. **Select the rows** for the first user
3. Click the **Fill color** button (paint bucket icon)
4. Choose light blue (e.g., `#D0E8FF`)
5. Skip the second user
6. Apply blue to the third user
7. Continue alternating

## Recommended Color Palette

For professional-looking reports:

| User Group | Color Name | Excel RGB | Hex Code |
|------------|------------|-----------|----------|
| User 1, 3, 5... | Light Blue | RGB(173, 216, 230) | #ADE8E6 |
| User 2, 4, 6... | White | RGB(255, 255, 255) | #FFFFFF |

Alternative colors:
- **Pale Blue**: RGB(207, 226, 243) / `#CFE2F3`
- **Light Cyan**: RGB(208, 232, 255) / `#D0E8FF`
- **Baby Blue**: RGB(189, 215, 238) / `#BDD7EE`

## Pro Tips

### 1. Freeze Header Row
- **Excel**: View → Freeze Panes → Freeze Top Row
- **Google Sheets**: View → Freeze → 1 row

### 2. Apply Filters
- **Excel**: Home → Sort & Filter → Filter
- **Google Sheets**: Data → Create a filter

### 3. Adjust Column Widths
- Double-click between column headers to auto-fit

### 4. Save as Excel Format
After applying colors, save as `.xlsx` to preserve formatting:
- **Excel**: File → Save As → Excel Workbook (.xlsx)
- **Google Sheets**: File → Download → Microsoft Excel (.xlsx)

## Example Result

After applying blue colors to alternate users, your spreadsheet will look like:

```
Row 5:  [BLUE] Faizan Atif | New #123596: Meetings | 0.00 | 5.00 | 0 | 0
Row 6:  [BLUE] Faizan Atif | New #123643: Daily Scrum | 0.00 | 9.00 | 0 | 0
...
Row 27: [BLUE] Faizan Atif | New #156432: Availability History | 2.50 | 2.50 | 100 | 0
Row 28: [Empty row separator]
Row 29: [WHITE] Akasha Shahid | New #123596: Meetings | 0.00 | 4.00 | 0 | 0
Row 30: [WHITE] Akasha Shahid | New #123643: Daily Scrum | 0.00 | 10.50 | 0 | 0
...
```

This creates a clean, easy-to-read report with visual separation between different users!

## Future Enhancement Idea

If you need this formatting automated, we could:
1. Generate an Excel file directly (using a library like `exceljs` or `xlsx`)
2. Apply colors programmatically in the backend
3. Return a formatted `.xlsx` file instead of CSV

Let me know if you'd like me to implement direct Excel export with colors! 📊

