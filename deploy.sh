#!/bin/bash

# Ask the user for the version number
echo "Enter the version number (e.g. 1.0.1):"
read version

# Validate the input as a semver version number
if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid version number format. Please use semver (e.g. 1.0.1)"
    exit 1
fi

# Git add and commit
git add .
echo "Enter commit message:"
read commit_message
git commit -m "$commit_message"

# Push to main branch
git push origin main

# Create and push tag
git tag -a $version -m "$version"
git push origin $version

echo "Deployment completed for version $version"
