"""
Backend API Tests for Product Transaction Feature - SupplySync
Tests: Transaction CRUD, integer validation, negative quantity handling
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_DEALER_EMAIL = "dealer1@supplysync.com"
TEST_DEALER_PASSWORD = "password123"
SUBCATEGORY_ID = "528c0e94-fe57-4d67-9b20-4c7c630bd1ab"


class TestAuthAndSetup:
    """Test auth and get required IDs"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_dealer_login(self):
        """Test dealer login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_DEALER_EMAIL,
            "password": TEST_DEALER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == TEST_DEALER_EMAIL
        assert data["user"]["user_type"] == "dealer"
        print(f"✓ Login successful for: {data['user']['email']}")


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_DEALER_EMAIL,
        "password": TEST_DEALER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def product_id(auth_token):
    """Get first product ID from subcategory"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/dealer/subcategories/{SUBCATEGORY_ID}/products", headers=headers)
    if response.status_code != 200:
        pytest.skip(f"Could not fetch products: {response.text}")
    
    products = response.json().get("products", [])
    if not products:
        pytest.skip("No products found in subcategory")
    
    return products[0]["id"]


class TestTransactionAPI:
    """Test POST /api/dealer/products/{id}/transactions endpoint"""
    
    def test_add_quantity_transaction(self, auth_token, product_id):
        """Test ADD transaction - increase quantity"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get current quantity
        response = requests.get(f"{BASE_URL}/api/dealer/subcategories/{SUBCATEGORY_ID}/products", headers=headers)
        assert response.status_code == 200
        products = response.json()["products"]
        product = next((p for p in products if p["id"] == product_id), None)
        initial_qty = product["current_quantity"]
        
        # Execute ADD transaction
        add_qty = 10
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions", 
            headers=headers,
            json={
                "transaction_type": "add",
                "quantity": add_qty
            })
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == f"Transaction successful: add {add_qty} boxes"
        assert data["transaction"]["type"] == "add"
        assert data["transaction"]["quantity"] == add_qty
        assert data["transaction"]["quantity_before"] == initial_qty
        assert data["transaction"]["quantity_after"] == initial_qty + add_qty
        assert data["product"]["current_quantity"] == initial_qty + add_qty
        print(f"✓ ADD transaction: {initial_qty} + {add_qty} = {data['product']['current_quantity']}")
    
    def test_subtract_quantity_transaction_positive_result(self, auth_token, product_id):
        """Test SUBTRACT transaction with positive remaining quantity"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current quantity
        response = requests.get(f"{BASE_URL}/api/dealer/subcategories/{SUBCATEGORY_ID}/products", headers=headers)
        products = response.json()["products"]
        product = next((p for p in products if p["id"] == product_id), None)
        initial_qty = product["current_quantity"]
        
        # Subtract small amount
        subtract_qty = 5
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "subtract",
                "quantity": subtract_qty
            })
        
        assert response.status_code == 200
        data = response.json()
        assert data["transaction"]["type"] == "subtract"
        assert data["transaction"]["quantity"] == subtract_qty
        assert data["transaction"]["quantity_after"] == initial_qty - subtract_qty
        print(f"✓ SUBTRACT transaction (positive): {initial_qty} - {subtract_qty} = {data['product']['current_quantity']}")
    
    def test_subtract_quantity_transaction_negative_result(self, auth_token, product_id):
        """Test SUBTRACT transaction resulting in negative quantity (allowed after confirmation)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current quantity
        response = requests.get(f"{BASE_URL}/api/dealer/subcategories/{SUBCATEGORY_ID}/products", headers=headers)
        products = response.json()["products"]
        product = next((p for p in products if p["id"] == product_id), None)
        initial_qty = product["current_quantity"]
        
        # Subtract more than available
        large_subtract = initial_qty + 100
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "subtract",
                "quantity": large_subtract
            })
        
        # Backend allows negative quantities (per PRD - requires confirmation in UI)
        assert response.status_code == 200
        data = response.json()
        assert data["transaction"]["quantity_after"] < 0
        print(f"✓ SUBTRACT transaction (negative result): {initial_qty} - {large_subtract} = {data['product']['current_quantity']}")
        
        # Restore quantity for other tests
        restore_qty = abs(data["product"]["current_quantity"]) + 55
        requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={"transaction_type": "add", "quantity": restore_qty})


class TestIntegerValidation:
    """Test integer validation for quantity field"""
    
    def test_reject_decimal_quantity(self, auth_token, product_id):
        """Reject decimal/float quantity - must be integer"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "add",
                "quantity": 5.5
            })
        
        # Backend should reject non-integer
        assert response.status_code == 400
        print(f"✓ Decimal quantity rejected: {response.json().get('detail')}")
    
    def test_reject_negative_quantity_value(self, auth_token, product_id):
        """Reject negative number as quantity value"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "add",
                "quantity": -5
            })
        
        assert response.status_code == 400
        print(f"✓ Negative quantity value rejected: {response.json().get('detail')}")
    
    def test_reject_zero_quantity(self, auth_token, product_id):
        """Reject zero as quantity"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "add",
                "quantity": 0
            })
        
        assert response.status_code == 400
        print(f"✓ Zero quantity rejected: {response.json().get('detail')}")
    
    def test_reject_string_quantity(self, auth_token, product_id):
        """Reject string as quantity"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "add",
                "quantity": "five"
            })
        
        assert response.status_code == 400
        print(f"✓ String quantity rejected: {response.json().get('detail')}")
    
    def test_reject_invalid_transaction_type(self, auth_token, product_id):
        """Reject invalid transaction type"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "multiply",
                "quantity": 5
            })
        
        assert response.status_code == 400
        data = response.json()
        assert "transaction_type must be 'add' or 'subtract'" in data["detail"]
        print(f"✓ Invalid transaction type rejected: {data['detail']}")


class TestTransactionHistory:
    """Test GET /api/dealer/products/{id}/transactions endpoint"""
    
    def test_get_transaction_history(self, auth_token, product_id):
        """Get transaction history for product"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/dealer/products/{product_id}/transactions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "product" in data
        assert "transactions" in data
        assert "total_count" in data
        
        # Validate product info
        assert "id" in data["product"]
        assert "brand" in data["product"]
        assert "name" in data["product"]
        assert "current_quantity" in data["product"]
        
        # Validate transactions
        if data["transactions"]:
            txn = data["transactions"][0]
            assert "id" in txn
            assert "transaction_type" in txn
            assert "quantity" in txn
            assert "quantity_before" in txn
            assert "quantity_after" in txn
            assert "created_at" in txn
            assert "created_by" in txn
        
        print(f"✓ Transaction history retrieved: {data['total_count']} transactions")
    
    def test_transaction_history_ordering(self, auth_token, product_id):
        """Verify transactions are ordered by created_at desc"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/dealer/products/{product_id}/transactions", headers=headers)
        assert response.status_code == 200
        
        transactions = response.json()["transactions"]
        if len(transactions) > 1:
            # Verify newest first
            for i in range(len(transactions) - 1):
                assert transactions[i]["created_at"] >= transactions[i+1]["created_at"]
            print(f"✓ Transactions ordered correctly (newest first)")
        else:
            print(f"✓ Not enough transactions to verify ordering")


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_transaction_nonexistent_product(self, auth_token):
        """Test transaction on non-existent product"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.post(f"{BASE_URL}/api/dealer/products/{fake_id}/transactions",
            headers=headers,
            json={
                "transaction_type": "add",
                "quantity": 5
            })
        
        assert response.status_code == 404
        print(f"✓ Non-existent product returns 404")
    
    def test_unauthorized_access(self, product_id):
        """Test access without auth token"""
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            json={
                "transaction_type": "add",
                "quantity": 5
            })
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]
        print(f"✓ Unauthorized access rejected: {response.status_code}")
    
    def test_missing_required_fields(self, auth_token, product_id):
        """Test missing required fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Missing transaction_type
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={"quantity": 5})
        assert response.status_code == 400
        
        # Missing quantity
        response = requests.post(f"{BASE_URL}/api/dealer/products/{product_id}/transactions",
            headers=headers,
            json={"transaction_type": "add"})
        assert response.status_code == 400
        
        print(f"✓ Missing required fields rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
