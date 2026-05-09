#!/bin/bash
# Start the Django backend server

cd "$(dirname "$0")/backend"
export PATH="$HOME/.local/bin:$PATH"

echo "Starting HelpDesk Pro Django Backend..."
echo "API will be available at http://localhost:8000/api/"
echo "Admin panel at http://localhost:8000/admin/"
echo ""
echo "Default login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""

python3 manage.py runserver 0.0.0.0:8000
