import pandas as pd
from supabase import create_client

SUPABASE_URL = "https://oytvukfarhlzijxkkvvt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dHZ1a2ZhcmhsemlqeGtrdnZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg0MDExNywiZXhwIjoyMDkxNDE2MTE3fQ.8Fz3yaNuxukr0_6B28lN7VGk5pbd3MpDY4eWuJO1CtM"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
EXCEL_FILE = "Small_Business_Accounting.xlsx"
all_sheets = pd.read_excel(EXCEL_FILE, sheet_name=None)

income_df = all_sheets["Income"].dropna(subset=["Amount"])
income_rows = []
for _, row in income_df.iterrows():
    income_rows.append({
        "date": str(row["Date"])[:10] if pd.notna(row["Date"]) else None,
        "customer_name": str(row["Customer Name"]).strip() if pd.notna(row["Customer Name"]) else None,
        "category": str(row["Category"]).strip() if pd.notna(row["Category"]) else None,
        "description": str(row["Description"]).strip() if pd.notna(row["Description"]) else None,
        "amount": float(row["Amount"]),
        "payment_method": str(row["Payment Method"]).strip().replace("\t", "") if pd.notna(row["Payment Method"]) else None,
        "notes": str(row["Notes"]).strip() if pd.notna(row["Notes"]) else None,
    })
supabase.table("finance_income").insert(income_rows).execute()
print(f"✅ Income: {len(income_rows)} rows imported")

expenses_df = all_sheets["Expenses"].dropna(subset=["Amount"])
expense_rows = []
for _, row in expenses_df.iterrows():
    expense_rows.append({
        "date": str(row["Date"])[:10] if pd.notna(row["Date"]) else None,
        "vendor": str(row["Vendor/Payee"]).strip() if pd.notna(row["Vendor/Payee"]) else None,
        "category": str(row["Category"]).strip() if pd.notna(row["Category"]) else None,
        "description": str(row["Description"]).strip() if pd.notna(row["Description"]) else None,
        "amount": float(row["Amount"]),
        "payment_method": str(row["Payment Method"]).strip().replace("\t", "") if pd.notna(row["Payment Method"]) else None,
        "notes": str(row["Notes"]).strip() if pd.notna(row["Notes"]) else None,
    })
supabase.table("finance_expenses").insert(expense_rows).execute()
print(f"✅ Expenses: {len(expense_rows)} rows imported")

inventory_df = all_sheets["Inventory"].dropna(subset=["Item Name"])
inventory_rows = []
for _, row in inventory_df.iterrows():
    inventory_rows.append({
        "date": str(row["Date"])[:10] if pd.notna(row["Date"]) else None,
        "item_name": str(row["Item Name"]).strip() if pd.notna(row["Item Name"]) else None,
        "quantity": float(row["Quantity"]) if pd.notna(row["Quantity"]) else None,
        "cost_per_unit": float(row["Cost per Unit"]) if pd.notna(row["Cost per Unit"]) else None,
        "total_cost": float(row["Total Cost"]) if pd.notna(row["Total Cost"]) else None,
        "supplier": str(row["Supplier"]).strip() if pd.notna(row["Supplier"]) else None,
        "notes": str(row["Notes"]).strip() if pd.notna(row["Notes"]) else None,
    })
supabase.table("finance_inventory").insert(inventory_rows).execute()
print(f"✅ Inventory: {len(inventory_rows)} rows imported")

print("\n🎉 All data imported successfully into Supabase!")
