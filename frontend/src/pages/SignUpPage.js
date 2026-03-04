import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Building2, User, Phone, MapPin, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import api from '../utils/api';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    mobileNumber: '',
    city: '',
    state: '',
    postalCode: '',
    fullAddress: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be 10 digits';
    }
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!/^\d{6}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Postal code must be 6 digits';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/signup', {
        business_name: formData.businessName,
        owner_name: formData.ownerName,
        phone: formData.mobileNumber,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        address: formData.fullAddress || null,
        email: formData.email,
        password: formData.password,
      });

      toast({
        title: "Account created successfully!",
        description: "Please login with your credentials",
        duration: 3000,
      });

      // Redirect to login page
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.response?.data?.detail || 'Failed to create account. Please try again.',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-orange rounded-full flex items-center justify-center">
              <Building2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-display text-slate-dark">
            Create Dealer Account
          </CardTitle>
          <CardDescription className="text-base">
            Join SupplySync - India's leading B2B tile marketplace
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-dark flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-orange" />
                Business Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="businessName">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    type="text"
                    placeholder="Your Business Name"
                    value={formData.businessName}
                    onChange={handleChange}
                    className={errors.businessName ? 'border-red-500' : ''}
                  />
                  {errors.businessName && (
                    <p className="text-xs text-red-500">{errors.businessName}</p>
                  )}
                </div>

                {/* Owner Name */}
                <div className="space-y-2">
                  <Label htmlFor="ownerName">
                    Owner Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    placeholder="Your Full Name"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className={errors.ownerName ? 'border-red-500' : ''}
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-red-500">{errors.ownerName}</p>
                  )}
                </div>

                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      maxLength={10}
                      className={`pl-10 ${errors.mobileNumber ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.mobileNumber && (
                    <p className="text-xs text-red-500">{errors.mobileNumber}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="Your City"
                      value={formData.city}
                      onChange={handleChange}
                      className={`pl-10 ${errors.city ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.city && (
                    <p className="text-xs text-red-500">{errors.city}</p>
                  )}
                </div>

                {/* State */}
                <div className="space-y-2">
                  <Label htmlFor="state">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="state"
                    name="state"
                    type="text"
                    placeholder="Your State"
                    value={formData.state}
                    onChange={handleChange}
                    className={errors.state ? 'border-red-500' : ''}
                  />
                  {errors.state && (
                    <p className="text-xs text-red-500">{errors.state}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div className="space-y-2">
                  <Label htmlFor="postalCode">
                    Postal Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    type="text"
                    placeholder="6-digit PIN code"
                    value={formData.postalCode}
                    onChange={handleChange}
                    maxLength={6}
                    className={errors.postalCode ? 'border-red-500' : ''}
                  />
                  {errors.postalCode && (
                    <p className="text-xs text-red-500">{errors.postalCode}</p>
                  )}
                </div>
              </div>

              {/* Full Address (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="fullAddress">
                  Full Address <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <textarea
                  id="fullAddress"
                  name="fullAddress"
                  placeholder="Complete business address"
                  value={formData.fullAddress}
                  onChange={handleChange}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Login Credentials Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-dark flex items-center">
                <Lock className="h-5 w-5 mr-2 text-orange" />
                Login Credentials
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">
                    Email ID <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={handleChange}
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-orange hover:bg-orange-dark h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Login Link */}
            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-orange hover:text-orange-dark font-semibold hover:underline"
              >
                Login here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;
