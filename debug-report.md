# Google Sheets Data Analysis Report

## Spreadsheet: NON CARGO (426 rows)

### Column Analysis Summary

| Column | Index | Valid Data | Empty/Null | Status |
|--------|-------|------------|------------|--------|
| **Target Division** | 29 | 0 (0%) | 426 (100%) | ❌ **EMPTY** |
| **Irregularity/Complain Category** | 9 | 206 (48.4%) | 220 (51.6%) | ⚠️ Partial |
| **Terminal Area Category** | 17 | 211 (49.5%) | 215 (50.5%) | ✅ Good |
| **Apron Area Category** | 18 | 152 (35.7%) | 274 (64.3%) | ✅ Good |
| **Status** | 21 | All valid | - | ✅ Good |
| **Severity** | - | Low only | - | ⚠️ Single value |

### Key Findings

1. **Target Division is COMPLETELY EMPTY** - All 426 rows have null values
   - Chart "Distribusi per Divisi" will never show data
   - **Recommendation**: Disable this chart or remove from generator

2. **Sub-Category has 51.6% empty values**
   - Valid values: Pax Handling, Operation, Baggage Handling, Cargo Problems, GSE
   - **Fix needed**: Filter empty strings in transform function ✓ (Already done)

3. **Terminal Area Category is healthy**
   - 6 unique categories with good distribution
   - Top: Baggage/Special/Irregularities Handling (83), Passenger Profilling (72)
   - Chart working correctly ✓

4. **Apron Area Category is healthy**
   - 11 unique categories
   - Top: Procedure Competencies (51), Accurancy & Completeness (24)
   - Chart working correctly ✓

### Google Sheets Headers (index: name)
```
0: Date of Event
1: Jenis Maskapai
2: Airlines
3: Flight Number
4: Reporting Branch
5: Branch
6: HUB
7: Route
8: Report Category
9: Irregularity/Complain Category
10: Report
11: Root Caused
12: Action Taken
13: Gapura KPS Action Taken
14: Report By
15: Upload Irregularity Photo
16: Area
17: Terminal Area Category
18: Apron Area Category
19: General Category
20: Conclusion Area
21: Status
22-26: VLOOKUP columns
27: Per Week in Month
28: Primary Tag
29: Sub Category Note
30: Target Division  ← ALL EMPTY!
```

### Recommended Actions

1. ✅ DONE: Updated SubCategory transform to filter empty values
2. ✅ DONE: Updated AreaSubCategory transform to handle data correctly
3. ⚠️ PENDING: Consider removing Target Division chart from generator
4. ✅ DONE: Added debug tools for future troubleshooting
